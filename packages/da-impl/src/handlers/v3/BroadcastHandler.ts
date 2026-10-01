import { LogFunction, MessageHandler } from "../MessageHandler"
import {
  ChannelState,
  ChannelType,
  ContextListenerRegistration,
  DesktopAgentEventListener,
  PrivateChannelEventListener,
  FDC3ServerInstance,
  StoredContextMetadata,
} from "../../FDC3ServerInstance"
import {
  InstanceID,
  ReceivableMessage,
  Fdc3ApiVersion,
} from "../../AppRegistration"
import {
  AppIdentifier,
  ChannelError,
  PrivateChannelEventTypes,
} from "@finos/fdc3-standard"
import { successResponse, errorResponse, FullAppIdentifier } from "./support"
import {
  AddContextListenerRequest,
  AddEventListenerRequest,
  AgentResponseMessage,
  AppRequestMessage,
  BroadcastRequest,
  ChannelChangedEvent,
  ClearContextRequest,
  ContextClearedEvent,
  ContextListenerUnsubscribeRequest,
  CreatePrivateChannelRequest,
  EventListenerUnsubscribeRequest,
  GetCurrentChannelRequest,
  GetCurrentContextRequest,
  GetOrCreateChannelRequest,
  GetUserChannelsRequest,
  JoinUserChannelRequest,
  LeaveCurrentChannelRequest,
  PrivateChannelAddEventListenerRequest,
  PrivateChannelDisconnectRequest,
  PrivateChannelOnAddContextListenerEvent,
  PrivateChannelOnDisconnectEvent,
  PrivateChannelOnUnsubscribeEvent,
  PrivateChannelUnsubscribeEventListenerRequest,
} from "@finos/fdc3-schema-v3/dist/generated/api/BrowserTypes"
import {
  PrivateChannelDisconnectServerInstanceEvent,
  FDC3ServerInstanceEvent,
  ChannelChangedServerInstanceEvent,
} from "../../FDC3ServerInstanceEvents"

type PrivateChannelEvents =
  | PrivateChannelOnAddContextListenerEvent
  | PrivateChannelOnUnsubscribeEvent
  | PrivateChannelOnDisconnectEvent

function onlyUniqueAppIds(
  value: AppIdentifier,
  index: number,
  self: AppIdentifier[],
) {
  const fi = self.findIndex((v) => v.instanceId === value.instanceId)
  return fi === index
}

/** Matches a listener's contextType (null = all, string, or string[]) against a context type. */
function matchesContextType(
  listenerType: string | string[] | null,
  contextType: string,
): boolean {
  if (listenerType == null) {
    return true
  }
  if (Array.isArray(listenerType)) {
    return listenerType.includes(contextType)
  }
  return listenerType == contextType
}

export class BroadcastHandler implements MessageHandler {
  private readonly log: LogFunction
  private readonly apiVersion: Fdc3ApiVersion = "3.0"

  constructor(log?: LogFunction) {
    this.log = log ?? (() => {})
  }

  shutdown(): void {}

  private matchesApiVersion(sc: FDC3ServerInstance, instanceId: string): boolean {
    const version = sc.getInstanceDetails(instanceId)?.fdc3Version ?? "2.2"
    return version === this.apiVersion
  }

  getCurrentChannel(
    from: FullAppIdentifier,
    sc: FDC3ServerInstance,
  ): ChannelState | null {
    return sc.getCurrentChannel(from.instanceId)
  }

  fireChannelChangedEvent(
    channelId: string | null,
    sc: FDC3ServerInstance,
    instanceId: string,
  ) {
    const hasChannelChangedListener = sc
      .getDesktopAgentEventListeners()
      .some(
        (listener) =>
          listener.instanceId === instanceId &&
          (listener.eventType === null ||
            listener.eventType === "USER_CHANNEL_CHANGED"),
      )
    if (!hasChannelChangedListener) {
      return
    }

    const event: ChannelChangedEvent = {
      meta: {
        eventUuid: sc.createUUID(),
        timestamp: new Date(),
      },
      type: "channelChangedEvent",
      payload: {
        newChannelId: channelId,
      },
    }

    sc.post(event, instanceId)
  }

  /**
   * Notifies apps that have registered a matching `CONTEXT_CLEARED` listener that context has
   * been cleared on a channel. Routing follows the scope carried on each registration:
   *  - Channel-scoped listeners (`channelId` set) match the cleared channel exactly.
   *  - Desktop Agent-level listeners (`channelId` null) match when the cleared channel is the
   *    listening app's current User channel.
   */
  fireContextClearedEvent(
    channelId: string,
    contextType: string | null,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const matchingInstanceIds = sc
      .getDesktopAgentEventListeners()
      .filter(
        (listener) =>
          listener.eventType === null || listener.eventType === "CONTEXT_CLEARED",
      )
      .filter((listener) => {
        if (listener.channelId !== null) {
          return listener.channelId === channelId
        }
        const currentChannel = sc.getCurrentChannel(listener.instanceId)
        return currentChannel != null && currentChannel.id === channelId
      })
      .filter((listener) => listener.instanceId !== from.instanceId)
      .map((listener) => listener.instanceId)
      .filter((instanceId, index, self) => self.indexOf(instanceId) === index)

    if (matchingInstanceIds.length === 0) {
      return
    }

    const event: ContextClearedEvent = {
      meta: {
        eventUuid: sc.createUUID(),
        timestamp: new Date(),
      },
      type: "contextClearedEvent",
      payload: {
        channelId,
        contextType,
      },
    }

    matchingInstanceIds.forEach((instanceId) => sc.post(event, instanceId))
  }

  convertChannelTypeToString(type: ChannelType): string {
    switch (type) {
      case ChannelType.app:
        return "app"
      case ChannelType.user:
        return "user"
      case ChannelType.private:
        return "private"
    }
  }

  async accept(
    msg: ReceivableMessage,
    sc: FDC3ServerInstance,
    uuid: InstanceID,
  ) {
    const from = sc.getInstanceDetails(uuid)

    if (from == null) {
      // this handler only deals with connected apps
      return
    }

    this.log(`BroadcastHandler: accept called with msg: ${JSON.stringify(msg)}`)

    try {
      switch (msg.type as string | null) {
        case "getOrCreateChannelRequest":
          return this.handleGetOrCreateRequest(
            msg as unknown as GetOrCreateChannelRequest,
            sc,
            from,
          )

        case "getUserChannelsRequest":
          return this.handleGetUserChannelsRequest(
            msg as unknown as GetUserChannelsRequest,
            sc,
            from,
          )
        case "leaveCurrentChannelRequest":
          return this.handleLeaveCurrentChannelRequest(
            msg as unknown as LeaveCurrentChannelRequest,
            sc,
            from,
          )
        case "joinUserChannelRequest":
          return this.handleJoinUserChannelRequest(
            msg as unknown as JoinUserChannelRequest,
            sc,
            from,
          )
        case "getCurrentChannelRequest":
          return this.handleGetCurrentChannelRequest(
            msg as unknown as GetCurrentChannelRequest,
            sc,
            from,
          )

        case "broadcastRequest":
          return this.handleBroadcastRequest(
            msg as unknown as BroadcastRequest, sc, from)
        case "clearContextRequest":
          return this.handleClearContextRequest(
            msg as unknown as ClearContextRequest,
            sc,
            from,
          )

        case "addContextListenerRequest":
          return this.handleAddContextListenerRequest(
            msg as unknown as AddContextListenerRequest,
            sc,
            from,
          )
        case "contextListenerUnsubscribeRequest":
          return this.handleContextListenerUnsubscribeRequest(
            msg as unknown as ContextListenerUnsubscribeRequest,
            sc,
            from,
          )

        case "createPrivateChannelRequest":
          return this.handleCreatePrivateChannelRequest(
            msg as unknown as CreatePrivateChannelRequest,
            sc,
            from,
          )
        case "privateChannelDisconnectRequest":
          return this.handlePrivateChannelDisconnectRequest(
            msg as unknown as PrivateChannelDisconnectRequest,
            sc,
            from,
          )

        case "privateChannelAddEventListenerRequest":
          return this.handlePrivateChannelAddEventListenerRequest(
            msg as unknown as PrivateChannelAddEventListenerRequest,
            from,
            sc,
          )
        case "privateChannelUnsubscribeEventListenerRequest":
          return this.handlePrivateChannelUnsubscribeEventListenerRequest(
            msg as unknown as PrivateChannelUnsubscribeEventListenerRequest,
            sc,
            from,
          )

        case "getCurrentContextRequest":
          return this.handleGetCurrentContextRequest(
            msg as unknown as GetCurrentContextRequest,
            sc,
            from,
          )

        case "addEventListenerRequest":
          return this.handleAddEventListenerRequest(
            msg as unknown as AddEventListenerRequest,
            sc,
            from,
          )
        case "eventListenerUnsubscribeRequest":
          return this.handleEventListenerUnsubscribeRequest(
            msg as unknown as EventListenerUnsubscribeRequest,
            sc,
            from,
          )
      }
    } catch (e) {
      const responseType = (msg.type as string).replace(
        new RegExp("Request$"),
        "Response",
      )
      errorResponse(
        sc,
        msg as unknown as AppRequestMessage,
        from,
        (e as Error).message ?? e,
        responseType as AgentResponseMessage["type"],
      )
    }
  }

  handleAddEventListenerRequest(
    arg0: AddEventListenerRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const payload = arg0.payload as { type?: string | null; channelId?: string | null }
    const channelId = payload.channelId ?? null
    if (channelId !== null && sc.getChannelById(channelId) === null) {
      errorResponse(
        sc,
        arg0,
        from,
        ChannelError.NoChannelFound,
        "addEventListenerResponse",
      )
      return
    }

    const lr: DesktopAgentEventListener = {
      appId: from.appId,
      instanceId: from.instanceId ?? "no-instance-id",
      listenerUuid: sc.createUUID(),
      eventType: payload.type ?? null,
      channelId: channelId,
    }

    sc.addDesktopAgentEventListener(lr)
    successResponse(
      sc,
      arg0,
      from,
      { listenerUUID: lr.listenerUuid },
      "addEventListenerResponse",
    )
  }

  handleEventListenerUnsubscribeRequest(
    arg0: EventListenerUnsubscribeRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const removed = sc.removeDesktopAgentEventListener(
      arg0.payload.listenerUUID,
    )
    if (removed) {
      successResponse(sc, arg0, from, {}, "eventListenerUnsubscribeResponse")
    } else {
      errorResponse(
        sc,
        arg0,
        from,
        "ListenerNotFound",
        "eventListenerUnsubscribeResponse",
      )
    }
  }

  handleCreatePrivateChannelRequest(
    arg0: CreatePrivateChannelRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const id = sc.createUUID()
    sc.addChannelState({
      id,
      type: ChannelType.private,
      context: [],
      displayMetadata: {},
    })

    successResponse(
      sc,
      arg0,
      from,
      {
        privateChannel: {
          id,
          type: this.convertChannelTypeToString(ChannelType.private),
        },
      },
      "createPrivateChannelResponse",
    )
  }

  handleGetCurrentContextRequest(
    arg0: GetCurrentContextRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const channel = sc.getChannelById(arg0.payload.channelId)
    const type = arg0.payload.contextType

    if (channel) {
      const stored = type
        ? (channel.context.find((c) => c.context.type == type) ?? null)
        : (channel.context[0] ?? null)
      successResponse(
        sc,
        arg0,
        from,
        {
          context: stored?.context ?? null,
          metadata: stored?.metadata ?? null,
        },
        "getCurrentContextResponse",
      )
    } else {
      errorResponse(
        sc,
        arg0,
        from,
        ChannelError.NoChannelFound,
        "getCurrentContextResponse",
      )
    }
  }

  handlePrivateChannelUnsubscribeEventListenerRequest(
    arg0: PrivateChannelUnsubscribeEventListenerRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const removed = sc.removePrivateChannelEventListener(
      arg0.payload.listenerUUID,
    )
    if (removed) {
      successResponse(
        sc,
        arg0,
        from,
        {},
        "privateChannelUnsubscribeEventListenerResponse",
      )
    } else {
      errorResponse(
        sc,
        arg0,
        from,
        "ListenerNotFound",
        "privateChannelUnsubscribeEventListenerResponse",
      )
    }
  }

  handlePrivateChannelDisconnectRequest(
    arg0: PrivateChannelDisconnectRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const toUnsubscribe = sc
      .getContextListeners()
      .filter((r) => r.appId == from.appId && r.instanceId == from.instanceId)
      .filter((r) => r.channelId == arg0.payload.channelId)

    toUnsubscribe.forEach((u) => {
      this.invokePrivateChannelEventListeners(
        arg0.payload.channelId,
        "unsubscribe",
        "privateChannelOnUnsubscribeEvent",
        sc,
        u.contextType,
      )
    })

    toUnsubscribe.forEach((u) => {
      sc.removeContextListener(u.listenerUuid, u.instanceId)
    })

    this.invokePrivateChannelEventListeners(
      arg0.payload.channelId,
      "disconnect",
      "privateChannelOnDisconnectEvent",
      sc,
    )
    successResponse(sc, arg0, from, {}, "privateChannelDisconnectResponse")
  }

  handleContextListenerUnsubscribeRequest(
    arg0: ContextListenerUnsubscribeRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const rl = sc
      .getContextListeners()
      .find(
        (r) =>
          r.listenerUuid == arg0.payload.listenerUUID &&
          r.instanceId == from.instanceId,
      )

    if (rl) {
      const channel = sc.getChannelById(rl.channelId)
      this.invokePrivateChannelEventListeners(
        channel?.id ?? null,
        "unsubscribe",
        "privateChannelOnUnsubscribeEvent",
        sc,
        rl.contextType,
      )
      sc.removeContextListener(arg0.payload.listenerUUID, from.instanceId)
      successResponse(sc, arg0, from, {}, "contextListenerUnsubscribeResponse")
    } else {
      errorResponse(
        sc,
        arg0,
        from,
        "ListenerNotFound",
        "contextListenerUnsubscribeResponse",
      )
    }
  }

  handleAddContextListenerRequest(
    arg0: AddContextListenerRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    let channelId = null

    if (arg0.payload?.channelId) {
      const channel = sc.getChannelById(arg0.payload?.channelId)

      if (channel == null) {
        errorResponse(
          sc,
          arg0,
          from,
          ChannelError.NoChannelFound,
          "addContextListenerResponse",
        )
        return
      } else {
        channelId = channel.id
      }
    }

    // Support both singular contextType and plural contextTypes (xor / normalize)
    const lr: ContextListenerRegistration = {
      appId: from.appId,
      instanceId: from.instanceId ?? "no-instance-id",
      channelId: channelId,
      listenerUuid: sc.createUUID(),
      contextType: arg0.payload.contextTypes ?? arg0.payload.contextType ?? null,
    }

    sc.addContextListener(lr)
    this.invokePrivateChannelEventListeners(
      channelId,
      "addContextListener",
      "privateChannelOnAddContextListenerEvent",
      sc,
      lr.contextType,
    )
    successResponse(
      sc,
      arg0,
      from,
      { listenerUUID: lr.listenerUuid },
      "addContextListenerResponse",
    )
  }

  handleBroadcastRequest(
    arg0: BroadcastRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const matchesExactChannel = (r: ContextListenerRegistration) => {
      return r.channelId == arg0.payload.channelId
    }

    const matchesUserChannel = (r: ContextListenerRegistration) => {
      const uc = sc.getCurrentChannel(r.instanceId)
      const ucId = uc ? uc.id : null
      return r.channelId == null && ucId == arg0.payload.channelId
    }

    const matchingListeners = sc
      .getContextListeners()
      .filter((r) => matchesExactChannel(r) || matchesUserChannel(r))
      .filter((r) =>
        matchesContextType(r.contextType, arg0.payload.context.type),
      )
      .filter((r) => r.instanceId !== from.instanceId)

    const matchingApps: FullAppIdentifier[] = matchingListeners
      .map((r) => {
        return { appId: r.appId, instanceId: r.instanceId }
      })
      .filter(onlyUniqueAppIds)

    const appProvidedMetadata = arg0.payload.metadata ?? {}

    const metadata: StoredContextMetadata = {
      source: { appId: from.appId, instanceId: from.instanceId },
      timestamp: new Date(),
      traceId: appProvidedMetadata.traceId ?? sc.createUUID(),
      ...(appProvidedMetadata.signature !== undefined && {
        signature: appProvidedMetadata.signature,
      }),
      ...(appProvidedMetadata.antiReplay !== undefined && {
        antiReplay: appProvidedMetadata.antiReplay,
      }),
      ...(appProvidedMetadata.custom !== undefined && {
        custom: appProvidedMetadata.custom,
      }),
    }

    const msg = {
      meta: {
        eventUuid: sc.createUUID(),
        timestamp: new Date(),
      },
      type: "broadcastEvent" as const,
      payload: {
        channelId: arg0.payload.channelId,
        context: arg0.payload.context,
        metadata,
      },
    }

    matchingApps.forEach((app) => {
      sc.post(msg, app.instanceId)
    })

    sc.updateChannelContext(arg0.payload.channelId, arg0.payload.context, metadata)
    successResponse(sc, arg0, from, {}, "broadcastResponse")
  }

  handleClearContextRequest(
    arg0: ClearContextRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const channelId = arg0.payload.channelId
    const contextType = arg0.payload.contextType ?? null

    const channel = sc.getChannelById(channelId)
    if (!channel) {
      errorResponse(
        sc,
        arg0,
        from,
        ChannelError.NoChannelFound,
        "clearContextResponse",
      )
      return
    }

    sc.clearChannelContext(channelId, contextType)
    this.fireContextClearedEvent(channelId, contextType, sc, from)
    successResponse(sc, arg0, from, {}, "clearContextResponse")
  }

  handleGetCurrentChannelRequest(
    arg0: GetCurrentChannelRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const currentChannel = this.getCurrentChannel(from, sc)
    if (currentChannel) {
      successResponse(
        sc,
        arg0,
        from,
        {
          channel: {
            id: currentChannel.id,
            type: this.convertChannelTypeToString(currentChannel.type),
            displayMetadata: currentChannel.displayMetadata,
          },
        },
        "getCurrentChannelResponse",
      )
    } else {
      successResponse(
        sc,
        arg0,
        from,
        { channel: null },
        "getCurrentChannelResponse",
      )
    }
  }

  handleJoinUserChannelRequest(
    arg0: JoinUserChannelRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const newChannel = sc.getChannelById(arg0.payload.channelId)
    if (newChannel == null || newChannel.type != ChannelType.user) {
      return errorResponse(
        sc,
        arg0,
        from,
        ChannelError.NoChannelFound,
        "joinUserChannelResponse",
      )
    }

    const instanceId = from.instanceId ?? "no-instance-id"
    sc.setCurrentChannel(instanceId, newChannel)
    successResponse(sc, arg0, from, {}, "joinUserChannelResponse")
  }

  handleLeaveCurrentChannelRequest(
    arg0: LeaveCurrentChannelRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const instanceId = from.instanceId ?? "no-instance-id"
    sc.setCurrentChannel(instanceId, null)
    successResponse(sc, arg0, from, {}, "leaveCurrentChannelResponse")
  }

  handleGetOrCreateRequest(
    arg0: GetOrCreateChannelRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const id = arg0.payload.channelId
    let channel = sc.getChannelById(id)

    if (!channel) {
      channel = {
        id: id,
        type: ChannelType.app,
        context: [],
        displayMetadata: {},
      }
      sc.addChannelState(channel)
    }

    // only allow retrieval of app channels or user channels
    if (channel.type == ChannelType.app || channel.type == ChannelType.user) {
      successResponse(
        sc,
        arg0,
        from,
        {
          channel: {
            id: channel.id,
            type: this.convertChannelTypeToString(channel.type),
          },
        },
        "getOrCreateChannelResponse",
      )
    } else {
      // block retrieval of private channels
      errorResponse(
        sc,
        arg0,
        from,
        ChannelError.AccessDenied,
        "getOrCreateChannelResponse",
      )
    }
  }

  handleGetUserChannelsRequest(
    arg0: GetUserChannelsRequest,
    sc: FDC3ServerInstance,
    from: FullAppIdentifier,
  ) {
    const userChannels = sc
      .getChannelStates()
      .filter((c) => c.type == ChannelType.user)
    successResponse(
      sc,
      arg0,
      from,
      {
        userChannels: userChannels.map((c) => ({
          id: c.id,
          type: this.convertChannelTypeToString(c.type),
          displayMetadata: c.displayMetadata,
        })),
      },
      "getUserChannelsResponse",
    )
  }

  handlePrivateChannelAddEventListenerRequest(
    arg0: PrivateChannelAddEventListenerRequest,
    from: FullAppIdentifier,
    sc: FDC3ServerInstance,
  ) {
    const channel = sc.getChannelById(arg0.payload.privateChannelId)

    if (channel == null || channel.type != ChannelType.private) {
      errorResponse(
        sc,
        arg0,
        from,
        ChannelError.NoChannelFound,
        "privateChannelAddEventListenerResponse",
      )
    } else {
      const el = {
        appId: from.appId,
        instanceId: from.instanceId,
        channelId: arg0.payload.privateChannelId,
        eventType: arg0.payload.listenerType,
        listenerUuid: sc.createUUID(),
      } as PrivateChannelEventListener
      sc.addPrivateChannelEventListener(el)
      successResponse(
        sc,
        arg0,
        from,
        { listenerUUID: el.listenerUuid },
        "privateChannelAddEventListenerResponse",
      )
    }
  }

  invokePrivateChannelEventListeners(
    privateChannelId: string | null,
    eventType: PrivateChannelEventTypes,
    messageType:
      | "privateChannelOnAddContextListenerEvent"
      | "privateChannelOnUnsubscribeEvent"
      | "privateChannelOnDisconnectEvent",
    sc: FDC3ServerInstance,
    contextType?: string | string[] | null,
  ) {
    if (privateChannelId) {
      const payload: {
        privateChannelId: string
        contextType?: string | null
        contextTypes?: string[]
      } = {
        privateChannelId,
      }
      if (Array.isArray(contextType)) {
        payload.contextTypes = contextType
      } else {
        payload.contextType = contextType
      }

      const msg: PrivateChannelEvents = {
        type: messageType,
        meta: {
          eventUuid: sc.createUUID(),
          timestamp: new Date(),
        },
        payload,
      } as PrivateChannelEvents

      this.log("invokePrivateChannelEventListeners msg: ", msg)
      sc.getPrivateChannelEventListeners()
        .filter(
          (listener) =>
            listener.channelId == privateChannelId &&
            (listener.eventType == eventType || listener.eventType == null),
        )
        .filter((listener) => this.matchesApiVersion(sc, listener.instanceId))
        .filter(onlyUniqueAppIds)
        .forEach((e) => {
          this.log(
            `invokePrivateChannelEventListeners: posting to instance ${e.instanceId}`,
          )
          sc.post(msg, e.instanceId)
        })
    }
  }

  async handleEvent(
    e: FDC3ServerInstanceEvent,
    sc: FDC3ServerInstance,
  ): Promise<void> {
    if (e.type === "privateChannelDisconnect") {
      const event = e as PrivateChannelDisconnectServerInstanceEvent

      const privateChannelsToDisconnect = new Set<string>()

      sc.getContextListeners()
        .filter((l) => l.channelId == event.channelId)
        .filter((l) => this.matchesApiVersion(sc, l.instanceId))
        .forEach((l) => {
          this.invokePrivateChannelEventListeners(
            l.channelId,
            "unsubscribe",
            "privateChannelOnUnsubscribeEvent",
            sc,
            l.contextType,
          )
          if (l.channelId) {
            privateChannelsToDisconnect.add(l.channelId)
          }
        })

      privateChannelsToDisconnect.forEach((chan) => {
        this.invokePrivateChannelEventListeners(
          chan,
          "disconnect",
          "privateChannelOnDisconnectEvent",
          sc,
        )
      })
    } else if (e.type === "channelChanged") {
      const event = e as ChannelChangedServerInstanceEvent
      if (!this.matchesApiVersion(sc, event.instanceId)) {
        return
      }
      return this.fireChannelChangedEvent(event.channelId, sc, event.instanceId)
    }
  }
}
