import { DirectoryApp } from "@finos/sail-headless-agent"
import { isAutoResolve } from "@finos/sail-env"
import { io, Socket } from "socket.io-client"
import type { SailReviewDecision, SailReviewRequest } from "@finos/sail-extension"
import { AppIdentifier, ResolveError } from "@finos/fdc3-standard-v3"
import {
  DA_APP_WINDOW_CLOSED,
  DA_DIRECTORY_LISTING,
  DA_HELLO,
  DA_REGISTER_APP_LAUNCH,
  DesktopAgentAppWindowClosedArgs,
  DesktopAgentDirectoryListingArgs,
  DesktopAgentHelloArgs,
  DesktopAgentRegisterAppLaunchArgs,
  SAIL_APP_CLOSE,
  SAIL_APP_OPEN,
  SAIL_APP_STATE,
  SAIL_BROADCAST_CONTEXT,
  SAIL_CHANNEL_CHANGE,
  SAIL_CHANNEL_SETUP,
  SAIL_CLIENT_STATE,
  SAIL_EXTENSION_DATA,
  SAIL_INTENT_RESOLVE,
  SAIL_REVIEW_CLOSED,
  SAIL_REVIEW_REQUEST,
  SailReviewClosedArgs,
  SAIL_WSCP_PAIRING_UPDATE,
  SailAppCloseArgs,
  SailAppOpenArgs,
  SailAppOpenResponse,
  SailAppStateArgs,
  SailBroadcastContextArgs,
  SailChannelChangeArgs,
  SailClientStateArgs,
  SailExtensionDataArgs,
  SailIntentResolveArgs,
  SailIntentResolveResponse,
  SailWscpPairingUpdateArgs,
} from "./message-types"
import { AppHosting } from "./app-hosting"
import { ServerState } from "./ServerState"
import { AppState } from "./AppState"
import { ClientState } from "./ClientState"

export class ServerStateImpl implements ServerState {
  socket: Socket | null = null
  resolveCallback: (x: SailIntentResolveResponse) => void = () => {}
  /** Socket acks for reviews the dialog is showing, by request id. */
  reviewCallbacks = new Map<string, (x: SailReviewDecision) => void>()
  cs: ClientState | null = null
  as: AppState | null = null

  init(cs: ClientState, as: AppState): void {
    if (this.cs == null) {
      this.cs = cs
      this.as = as
    }
  }

  async getApplications(): Promise<DirectoryApp[]> {
    if (!this.socket) {
      throw new Error("Desktop Agent not registered")
    }

    const userSessionId = this.cs!.getUserSessionID()
    const response = await this.socket.emitWithAck(DA_DIRECTORY_LISTING, {
      userSessionId,
    } as DesktopAgentDirectoryListingArgs)
    const out = response as DirectoryApp[]
    await this.cs!.setKnownApps(out)
    return out
  }

  async registerAppLaunch(
    appId: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string,
    instanceId?: string,
  ): Promise<string> {
    if (!this.socket) {
      throw new Error("Desktop Agent not registered")
    }

    const userSessionId = this.cs!.getUserSessionID()
    const args: DesktopAgentRegisterAppLaunchArgs = {
      userSessionId,
      appId,
      hosting,
      channel,
      instanceTitle,
    }
    if (instanceId) {
      args.instanceId = instanceId
    }
    return (await this.socket.emitWithAck(DA_REGISTER_APP_LAUNCH, args)) as string
  }

  async reportAppWindowClosed(instanceId: string): Promise<void> {
    if (!this.socket) {
      return
    }
    await this.socket.emitWithAck(DA_APP_WINDOW_CLOSED, {
      userSessionId: this.cs!.getUserSessionID(),
      instanceId,
    } as DesktopAgentAppWindowClosedArgs)
  }

  async sendClientState(cs: SailClientStateArgs): Promise<void> {
    if (!this.socket) {
      return
    }

    await this.socket.emitWithAck(SAIL_CLIENT_STATE, cs)
  }

  registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void> {
    // the socket is used for messages returning from the desktop
    // agent server to the client, such as requests to change
    // the user channel, open a new app, resolve an intent, etc.
    this.socket = io()

    return new Promise((resolve, reject) => {
      this.socket!.on("connect", () => {
        this.wireServerEvents()

        this.socket!.emit(DA_HELLO, props, () => {
          this.sendClientState(this.cs!.createArgs())
            .then(async () => {
              await this.getApplications()
              resolve()
            })
            .catch((e: unknown) => {
              console.error("Error sending client state", e)
              reject(e instanceof Error ? e : new Error(String(e)))
            })
        })
      })

      this.socket!.on("connect_error", (err: Error) => {
        reject(err)
      })
    })
  }

  /** Bind server→client socket handlers once the socket is connected. */
  private wireServerEvents(): void {
    if (!this.socket) {
      return
    }

    this.socket.on(
      SAIL_APP_OPEN,
      async (data: SailAppOpenArgs, callback: (response: SailAppOpenResponse) => void) => {
        // Honor server `approach` (forceNewWindow → Tab). Never infer Frame
        // solely from channel — that left 2.2 mocks in iframes that cannot
        // window.close(), so findIntent kept Connected zombies.
        if (data.channel) {
          await this.cs?.setActiveTabId(data.channel)
        }
        const openDetails = await this.as!.open(data.appDRecord, data.approach)
        callback(openDetails)
      },
    )

    this.socket.on(SAIL_APP_STATE, (data: SailAppStateArgs) => {
      this.as!.setAppState(data)
    })

    this.socket.on(SAIL_APP_CLOSE, async (data: SailAppCloseArgs, callback: () => void) => {
      try {
        await this.as!.closeApp(data.instanceId, data.hosting)
      } catch (e) {
        console.error("Error closing app container", e)
      } finally {
        callback()
      }
    })

    this.socket.on(SAIL_CHANNEL_SETUP, async (instanceId: string) => {
      const panel = this.cs!.getPanels().find(p => p.panelId === instanceId)
      if (panel) {
        await this.setUserChannel(instanceId, panel.tabId)
      }
    })

    this.socket.on(SAIL_INTENT_RESOLVE, (data: SailIntentResolveArgs, callback) => {
      // CI / Playwright: skip host ResolverPanel modal.
      // Vite injects import.meta.env in the browser bundle (typed loosely for tsc).
      const autoResolveRaw = (import.meta as { env?: { VITE_AUTO_RESOLVE?: string } }).env
        ?.VITE_AUTO_RESOLVE
      if (isAutoResolve(autoResolveRaw)) {
        const firstIntent = data.appIntents?.[0]
        const firstApp = firstIntent?.apps?.[0]
        const intentName = firstIntent?.intent?.name ?? null
        if (firstApp && intentName) {
          console.log("[Sail v2] Auto-resolving host intent", {
            intentName,
            app: firstApp,
          })
          callback({
            appIntents: [
              {
                intent: { name: intentName },
                apps: [firstApp],
              },
            ],
            channel: null,
            requestId: data.requestId,
            error: null,
          })
          return
        }
      }

      this.cs!.setIntentResolution({
        appIntents: data.appIntents,
        context: data.context,
        requestId: data.requestId,
      })

      this.resolveCallback = callback
    })

    this.socket.on(
      SAIL_REVIEW_REQUEST,
      (data: SailReviewRequest, callback: (x: SailReviewDecision) => void) => {
        this.reviewCallbacks.set(data.requestId, callback)
        this.cs!.addReviewRequest(data)
      },
    )

    // The server settled the review itself (deadline, disconnect, error): close the dialog,
    // and drop the ack so a late Allow / Block is never sent.
    this.socket.on(SAIL_REVIEW_CLOSED, (data: SailReviewClosedArgs) => {
      this.reviewCallbacks.delete(data.requestId)
      this.cs!.removeReviewRequest(data.requestId)
    })

    this.socket.on(SAIL_BROADCAST_CONTEXT, (data: SailBroadcastContextArgs) => {
      this.cs!.appendContextHistory(data.channelId, data.context)
    })

    this.socket.on(SAIL_EXTENSION_DATA, (data: SailExtensionDataArgs) => {
      for (const [extensionId, bag] of Object.entries(data)) {
        void this.cs!.setExtensionData(extensionId, {
          ...this.cs!.getExtensionData(extensionId),
          ...bag,
        })
      }
    })

    this.socket.on(SAIL_WSCP_PAIRING_UPDATE, (data: SailWscpPairingUpdateArgs) => {
      this.cs!.updateWscpPairingInstanceId(data.appId, data.sharedSecret, data.instanceId).catch(
        e => {
          console.error("Error updating WSCP pairing instanceId", e)
        },
      )
    })
  }

  async setUserChannel(instanceId: string, channelId: string): Promise<void> {
    await this.socket?.emitWithAck(SAIL_CHANNEL_CHANGE, {
      instanceId,
      channel: channelId,
      userSessionId: this.cs!.getUserSessionID(),
    } as SailChannelChangeArgs)
  }

  reviewChosen(requestId: string, decision: SailReviewDecision): void {
    // The server stops waiting at the deadline, so a late answer is simply ignored there.
    this.reviewCallbacks.get(requestId)?.(decision)
    this.reviewCallbacks.delete(requestId)
    this.cs!.removeReviewRequest(requestId)
  }

  intentChosen(
    requestId: string,
    ai: AppIdentifier | null,
    intent: string | null,
    channel: string | null,
  ) {
    if (this.resolveCallback) {
      if (ai && intent) {
        this.resolveCallback({
          appIntents: [
            {
              intent: {
                name: intent,
              },
              apps: [ai],
            },
          ],
          channel,
          requestId,
          error: null,
        })
      } else {
        this.resolveCallback({
          appIntents: [],
          channel: null,
          requestId,
          error: ResolveError.UserCancelled,
        })
      }
    }
  }
}
