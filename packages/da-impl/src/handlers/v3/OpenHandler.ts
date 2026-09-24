import { LogFunction, MessageHandler } from "../MessageHandler"
import { FDC3ServerInstance } from "../../FDC3ServerInstance"
import { InstanceID, State, ReceivableMessage } from "../../AppRegistration"
import { DirectoryApp } from "../../directory/DirectoryInterface"
import {
  ResolveError,
  AppIdentifier,
  AppMetadata,
  ImplementationMetadata,
} from "@finos/fdc3-standard"
import { CloseError } from "@finos/fdc3-standard-v3"
import { BrowserTypes } from "@finos/fdc3-schema-v3"
import { errorResponse, FullAppIdentifier, successResponse } from "./support"
import {
  AgentResponseMessage,
  AppRequestMessage,
  CloseRequest,
  GetInfoRequest,
  isAddContextListenerRequest,
  isCloseRequest,
  isFindInstancesRequest,
  isGetAppMetadataRequest,
  isGetInfoRequest,
  isOpenRequest,
  isWebConnectionProtocol4ValidateAppIdentity,
} from "@finos/fdc3-schema-v3/dist/generated/api/BrowserTypes"
import { AppState, PendingApp } from "../../PendingApp"

type AddContextListenerRequest = BrowserTypes.AddContextListenerRequest
type FindInstancesRequest = BrowserTypes.FindInstancesRequest
type GetAppMetadataRequest = BrowserTypes.GetAppMetadataRequest
type OpenRequest = BrowserTypes.OpenRequest
type WebConnectionProtocol4ValidateAppIdentity =
  BrowserTypes.WebConnectionProtocol4ValidateAppIdentity
type WebConnectionProtocol5ValidateAppIdentityFailedResponse =
  BrowserTypes.WebConnectionProtocol5ValidateAppIdentityFailedResponse
type WebConnectionProtocol5ValidateAppIdentitySuccessResponse =
  BrowserTypes.WebConnectionProtocol5ValidateAppIdentitySuccessResponse

export class OpenHandler implements MessageHandler {
  readonly timeoutMs: number
  private readonly log: LogFunction

  constructor(timeoutMs: number, log?: LogFunction) {
    this.timeoutMs = timeoutMs
    this.log = log ?? (() => {})
  }

  shutdown(): void {}

  async accept(
    msg: ReceivableMessage,
    sc: FDC3ServerInstance,
    uuid: InstanceID,
  ): Promise<void> {
    if (isWebConnectionProtocol4ValidateAppIdentity(msg)) {
      return this.handleValidate(
        msg as WebConnectionProtocol4ValidateAppIdentity,
        sc,
        uuid,
      )
    } else if (isAddContextListenerRequest(msg)) {
      //handle context listener adds for pending applications (i.e. opened but awaiting context listener addition to deliver context)
      //  additional handling is performed in BroadcastHandler
      return this.handleAddContextListener(
        msg as AddContextListenerRequest,
        sc,
        uuid,
      )
    } else {
      const from = sc.getInstanceDetails(uuid)
      if (from) {
        try {
          if (isOpenRequest(msg)) {
            return this.open(msg, sc, from)
          } else if (isFindInstancesRequest(msg)) {
            return this.findInstances(msg, sc, from)
          } else if (isGetAppMetadataRequest(msg)) {
            return this.getAppMetadata(msg, sc, from)
          } else if (isGetInfoRequest(msg)) {
            return this.getInfo(msg, sc, from)
          } else if (isCloseRequest(msg)) {
            return this.close(msg, sc, from)
          }
        } catch (e) {
          const responseType = (msg.type as string).replace(
            new RegExp("Request$"),
            "Response",
          ) as AgentResponseMessage["type"]
          errorResponse(
            sc,
            msg as unknown as AppRequestMessage,
            from,
            (e as Error).message ?? e,
            responseType,
          )
        }
      } else {
        this.log("Received message from unknown source, ignoring", msg, uuid)
      }
    }
  }

  /**
   * This deals with sending pending context to listeners of newly-opened apps.
   */
  handleAddContextListener(
    arg0: AddContextListenerRequest,
    sc: FDC3ServerInstance,
    from: InstanceID,
  ): void {
    const pendingOpen = sc.getPendingApp(from) as PendingApp | undefined
    if (pendingOpen) {
      const contextType = arg0.payload.contextType
      const contextTypes = arg0.payload.contextTypes
      if (
        pendingOpen.context &&
        pendingOpen.state == AppState.DeliveringContext
      ) {
        const typeMatches =
          contextType == pendingOpen.context.type ||
          contextType == undefined ||
          (contextTypes != undefined &&
            contextTypes.includes(pendingOpen.context.type))
        if (typeMatches) {
          // ok, we can deliver to this listener
          const appMeta = pendingOpen.appProvidedMetadata
          const message = {
            meta: {
              eventUuid: sc.createUUID(),
              timestamp: new Date(),
            },
            type: "broadcastEvent" as const,
            payload: {
              channelId: null as string | null,
              context: pendingOpen.context,
              metadata: {
                source: {
                  appId: pendingOpen.source.appId,
                  instanceId: pendingOpen.source.instanceId,
                },
                timestamp: new Date(),
                traceId: appMeta.traceId ?? sc.createUUID(),
                ...(appMeta.signature !== undefined && {
                  signature: appMeta.signature,
                }),
                ...(appMeta.antiReplay !== undefined && {
                  antiReplay: appMeta.antiReplay,
                }),
                ...(appMeta.custom !== undefined && {
                  custom: appMeta.custom,
                }),
              },
            },
          }

          pendingOpen.setDone()
          sc.removePendingApp(from)
          sc.post(message, from)
        }
      }
    }
  }

  filterPublicDetails(appD: DirectoryApp, appID: AppIdentifier): AppMetadata {
    return {
      appId: appD.appId,
      name: appD.name,
      version: appD.version,
      title: appD.title,
      tooltip: appD.tooltip,
      description: appD.description,
      icons: appD.icons,
      screenshots: appD.screenshots,
      instanceId: appID.instanceId,
    }
  }

  getAppMetadata(
    arg0: GetAppMetadataRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ): void {
    const appID = arg0.payload.app
    const details = sc.getDirectory().retrieveAppsById(appID.appId)
    if (details.length > 0) {
      successResponse(
        sc,
        arg0,
        from,
        {
          appMetadata: this.filterPublicDetails(details[0], appID),
        },
        "getAppMetadataResponse",
      )
    } else {
      errorResponse(
        sc,
        arg0,
        from,
        ResolveError.TargetAppUnavailable,
        "getAppMetadataResponse",
      )
    }
  }

  async findInstances(
    arg0: FindInstancesRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ): Promise<void> {
    const appId = arg0.payload.app.appId
    const openApps = await sc.getConnectedApps()
    const matching = openApps
      .filter((a) => a.appId == appId)
      .map((a) => {
        return {
          appId: a.appId,
          instanceId: a.instanceId,
        }
      })
    successResponse(
      sc,
      arg0,
      from,
      {
        appIdentifiers: matching,
      },
      "findInstancesResponse",
    )
  }

  async open(
    arg0: OpenRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ): Promise<void> {
    const toOpen = arg0.payload.app
    const context = arg0.payload.context

    try {
      const reqMeta = arg0.payload.metadata ?? {}
      const uuid = await sc.open(toOpen.appId)
      if (context) {
        sc.setPendingApp(
          uuid,
          new PendingApp(sc, arg0, context, from, this.timeoutMs, {
            traceId: reqMeta.traceId,
            signature: reqMeta.signature,
            antiReplay: reqMeta.antiReplay,
            custom: reqMeta.custom,
          }),
        )
      } else {
        // No context: resolve as soon as the app launches; do not wait for FDC3.
        successResponse(
          sc,
          arg0,
          from,
          {
            appIdentifier: {
              appId: toOpen.appId,
              instanceId: uuid,
            },
          },
          "openResponse",
        )
      }
    } catch (e) {
      errorResponse(sc, arg0, from, (e as Error).message ?? e, "openResponse")
    }
  }

  async getInfo(
    arg0: GetInfoRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ): Promise<void> {
    const implMetadata: ImplementationMetadata = this.getImplementationMetadata(
      sc,
      {
        appId: from.appId,
        instanceId: from.instanceId,
      },
      from,
    )
    successResponse(
      sc,
      arg0,
      from,
      {
        implementationMetadata: implMetadata,
      },
      "getInfoResponse",
    )
  }

  async close(
    arg0: CloseRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ): Promise<void> {
    if (!(await sc.isAppConnected(from.instanceId))) {
      errorResponse(
        sc,
        arg0,
        from,
        CloseError.ErrorOnClose,
        "closeResponse",
      )
      return
    }

    try {
      await sc.close(from.instanceId)
    } catch (e) {
      errorResponse(
        sc,
        arg0,
        from,
        (e as Error).message ?? CloseError.ErrorOnClose,
        "closeResponse",
      )
    }
  }

  getImplementationMetadata(
    sc: FDC3ServerInstance,
    appIdentity: AppIdentifier,
    from?: FullAppIdentifier,
  ) {
    const appMetadata = this.filterPublicDetails(
      sc.getDirectory().retrieveAppsById(appIdentity.appId)[0],
      appIdentity,
    )
    const details = from
      ? sc.getInstanceDetails(from.instanceId)
      : sc.getInstanceDetails(appIdentity.instanceId ?? "")
    return {
      provider: sc.provider(),
      providerVersion: sc.providerVersion(),
      fdc3Version: details?.fdc3Version ?? sc.fdc3Version(),
      optionalFeatures: {
        DesktopAgentBridging: false,
        OriginatingAppMetadata: true,
        UserChannelMembershipAPIs: true,
      },
      appMetadata: appMetadata,
    }
  }

  async handleValidate(
    arg0: WebConnectionProtocol4ValidateAppIdentity,
    sc: FDC3ServerInstance,
    from: InstanceID,
  ): Promise<void> {
    const responseMeta = {
      connectionAttemptUuid: arg0.meta.connectionAttemptUuid,
      timestamp: new Date(),
    }

    const returnError = () => {
      const msg: WebConnectionProtocol5ValidateAppIdentityFailedResponse = {
        meta: responseMeta,
        type: "WCP5ValidateAppIdentityFailedResponse",
        payload: {
          message: "App Instance not found",
        },
      }
      sc.post(msg, from)
    }

    const returnSuccess = (appId: string, instanceId: string) => {
      const implMetadata: ImplementationMetadata =
        this.getImplementationMetadata(
          sc,
          { appId, instanceId },
          { appId, instanceId },
        )
      const msg: WebConnectionProtocol5ValidateAppIdentitySuccessResponse = {
        meta: responseMeta,
        type: "WCP5ValidateAppIdentityResponse",
        payload: {
          appId: appId,
          instanceId: instanceId,
          instanceUuid: from,
          implementationMetadata: implMetadata,
        },
      }
      sc.post(msg, instanceId)
    }

    if (arg0.payload.instanceUuid) {
      // existing app reconnecting
      this.log("App attempting to reconnect:", arg0.payload.instanceUuid)
      const appIdentity = sc.getInstanceDetails(arg0.payload.instanceUuid)

      if (appIdentity) {
        // in this case, the app is reconnecting, so let's just re-assign the identity
        this.log(
          `Reassigned existing identity, appId: `,
          appIdentity.appId,
          ", instanceId",
          arg0.payload.instanceUuid,
        )
        sc.setInstanceDetails(from, appIdentity)
        sc.setAppState(from, State.Connected)
        return returnSuccess(appIdentity.appId, appIdentity.instanceId)
      } else {
        //we didn't find the identity, assign a new one
        this.log(
          "Existing identity not found for, assigning a new one: ",
          arg0.payload.instanceUuid,
        )
      }
    }

    // we need to assign an identity to this app - this should have been generated when it was launched
    const appIdentity = sc.getInstanceDetails(from)
    if (appIdentity) {
      sc.setAppState(appIdentity.instanceId, State.Connected)
      returnSuccess(appIdentity.appId, appIdentity.instanceId)

      // make sure, if the opener is listening for this app to open, then it gets informed
      const pendingOpen = sc.getPendingApp(from) as PendingApp | undefined
      if (pendingOpen) {
        if (pendingOpen.state == AppState.Opening) {
          pendingOpen.setOpened(appIdentity)
        }
      }
    } else {
      returnError()
    }
  }

  async handleEvent(): Promise<void> {
    // no-op
  }
}
