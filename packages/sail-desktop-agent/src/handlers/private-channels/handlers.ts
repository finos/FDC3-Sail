import { createDACPSuccessResponse, createDACPEvent } from "../../dacp/dacp-message-creators"
import type { DACPHandlerParams, DacpResponseDispatcher } from "../types"
import { sendDACPResponse, sendDACPErrorResponse } from "../utils/dacp-response-utils"
import type { BrowserTypes } from "@finos/fdc3"
import { ChannelError } from "@finos/fdc3"
import {
  FDC3ChannelError,
  ChannelCreationFailedError,
  ChannelAccessDeniedError,
  NoChannelFoundError,
  ListenerNotFoundChannelError,
} from "../../errors/fdc3-errors"
import { getInstance, getPrivateChannel } from "../../state/selectors"
import {
  createPrivateChannel,
  disconnectInstanceFromPrivateChannel,
  addPrivateChannelAddContextListenerListener,
  addPrivateChannelDisconnectListener,
  addPrivateChannelUnsubscribeListener,
  addPrivateChannelLifecycleCatchAllListener,
  removePrivateChannelAddContextListenerListener,
  removePrivateChannelDisconnectListener,
  removePrivateChannelUnsubscribeListener,
  removePrivateChannelLifecycleCatchAllListener,
} from "../../state/mutators"

/**
 * Handles createPrivateChannelRequest
 * Creates a new private channel for peer-to-peer communication between apps
 */
export function handleCreatePrivateChannelRequest(
  message: BrowserTypes.CreatePrivateChannelRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const instance = getInstance(getState(), instanceId)

    if (!instance) {
      throw new ChannelCreationFailedError(
        `Instance ${instanceId} not found for creating private channel`,
      )
    }

    // Generate channel ID
    const channelId = crypto.randomUUID()

    // Create the private channel using state transform
    setState(state => createPrivateChannel(state, channelId, instance.appId, instanceId))

    logger.info("DACP: Private channel created", {
      channelId,
      creatorAppId: instance.appId,
      creatorInstanceId: instanceId,
    })

    // Return channel information to the creator
    const response = createDACPSuccessResponse(message, "createPrivateChannelResponse", {
      privateChannel: {
        id: channelId,
        type: "private",
      },
    })

    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Create private channel failed", error)

    const errorType =
      error instanceof FDC3ChannelError ? error.errorType : ChannelError.CreationFailed
    const errorMessage = error instanceof Error ? error.message : "Failed to create private channel"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Handles privateChannelDisconnectRequest
 * Disconnects an instance from a private channel
 */
export function handlePrivateChannelDisconnectRequest(
  message: BrowserTypes.PrivateChannelDisconnectRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { channelId } = message.payload

    const state = getState()
    const channel = getPrivateChannel(state, channelId)
    if (!channel) {
      throw new NoChannelFoundError(`Private channel ${channelId} not found`)
    }

    if (!channel.connectedInstances.includes(instanceId)) {
      throw new ChannelAccessDeniedError(
        `Instance ${instanceId} is not connected to private channel ${channelId}`,
      )
    }

    // Unsubscribe all context listeners for this instance
    const contextListenersToRemove = Object.values(channel.contextListeners).filter(
      listener => listener.instanceId === instanceId,
    )

    notifyPrivateChannelUnsubscribeInternal(
      channel,
      contextListenersToRemove,
      instanceId,
      responses,
    )

    notifyPrivateChannelDisconnectInternal(channel, instanceId, responses)

    // Disconnect the instance using state transform
    setState(state => disconnectInstanceFromPrivateChannel(state, channelId, instanceId))

    logger.info("DACP: Instance disconnected from private channel", {
      channelId,
      instanceId,
      notifiedListeners: Object.values(channel.disconnectListeners).length,
    })

    // Send success response
    const response = createDACPSuccessResponse(message, "privateChannelDisconnectResponse")
    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Private channel disconnect failed", error)

    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage =
      error instanceof Error ? error.message : "Failed to disconnect from private channel"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Handles privateChannelAddEventListenerRequest
 */
export function handlePrivateChannelAddContextListenerRequest(
  message: BrowserTypes.PrivateChannelAddEventListenerRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { privateChannelId, listenerType } = message.payload
    const channelId = privateChannelId

    const state = getState()
    const channel = getPrivateChannel(state, channelId)
    if (!channel) {
      throw new NoChannelFoundError(`Private channel ${channelId} not found`)
    }

    if (!channel.connectedInstances.includes(instanceId)) {
      throw new ChannelAccessDeniedError(
        `Instance ${instanceId} is not connected to private channel ${channelId}`,
      )
    }

    const listenerId = crypto.randomUUID()

    if (listenerType === null) {
      setState(state =>
        addPrivateChannelLifecycleCatchAllListener(state, channelId, listenerId, instanceId),
      )
    } else {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- `listenerType` is parsed from an inbound DACP message payload; the schema type (no `undefined` member here) is an assumption about a well-behaved peer, not a guarantee.
      const resolvedListenerType = listenerType ?? "addContextListener"

      if (resolvedListenerType === "addContextListener") {
        setState(state =>
          addPrivateChannelAddContextListenerListener(state, channelId, listenerId, instanceId),
        )
      } else if (resolvedListenerType === "disconnect") {
        setState(state =>
          addPrivateChannelDisconnectListener(state, channelId, listenerId, instanceId),
        )
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- `resolvedListenerType` is derived from an inbound DACP message payload; deleting this check as "always true" removes the final `else { throw ChannelCreationFailedError }` as unreachable, so a garbage `listenerType` from a misbehaving peer would be SILENTLY treated as "unsubscribe" instead of raising an error.
      } else if (resolvedListenerType === "unsubscribe") {
        setState(state =>
          addPrivateChannelUnsubscribeListener(state, channelId, listenerId, instanceId),
        )
      } else {
        throw new ChannelCreationFailedError(
          "Unsupported private channel listener type: " + String(resolvedListenerType),
        )
      }
    }

    const resolvedListenerType =
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- `listenerType` is parsed from an inbound DACP message payload; the schema type is an assumption about a well-behaved peer, not a guarantee.
      listenerType === null ? "lifecycleCatchAll" : (listenerType ?? "addContextListener")

    logger.info("DACP: Private channel event listener added", {
      channelId,
      instanceId,
      listenerType: resolvedListenerType,
      listenerId,
    })

    // Send success response
    const response = createDACPSuccessResponse(message, "privateChannelAddEventListenerResponse", {
      listenerUUID: listenerId,
    })

    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Private channel add context listener failed", error)

    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add context listener to private channel"

    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

export function handlePrivateChannelUnsubscribeEventListenerRequest(
  message: BrowserTypes.PrivateChannelUnsubscribeEventListenerRequest,
  params: DACPHandlerParams,
): void {
  const { responses, instanceId, getState, setState, logger } = params

  try {
    const { listenerUUID } = message.payload
    const state = getState()
    const privateChannels = Object.values(state.channels.private)
    const channel = privateChannels.find(
      candidate =>
        candidate.addContextListenerListeners[listenerUUID] ||
        candidate.unsubscribeListeners[listenerUUID] ||
        candidate.disconnectListeners[listenerUUID] ||
        candidate.lifecycleCatchAllListeners[listenerUUID],
    )

    if (!channel) {
      throw new ListenerNotFoundChannelError(`Private channel listener ${listenerUUID} not found`)
    }

    const isOwnedByInstance =
      channel.addContextListenerListeners[listenerUUID]?.instanceId === instanceId ||
      channel.unsubscribeListeners[listenerUUID]?.instanceId === instanceId ||
      channel.disconnectListeners[listenerUUID]?.instanceId === instanceId ||
      channel.lifecycleCatchAllListeners[listenerUUID]?.instanceId === instanceId

    if (!isOwnedByInstance) {
      throw new ListenerNotFoundChannelError(
        `Private channel listener ${listenerUUID} not found for instance ${instanceId}`,
      )
    }

    if (channel.addContextListenerListeners[listenerUUID]) {
      setState(state =>
        removePrivateChannelAddContextListenerListener(state, channel.id, listenerUUID),
      )
    } else if (channel.unsubscribeListeners[listenerUUID]) {
      setState(state => removePrivateChannelUnsubscribeListener(state, channel.id, listenerUUID))
    } else if (channel.disconnectListeners[listenerUUID]) {
      setState(state => removePrivateChannelDisconnectListener(state, channel.id, listenerUUID))
    } else if (channel.lifecycleCatchAllListeners[listenerUUID]) {
      setState(state =>
        removePrivateChannelLifecycleCatchAllListener(state, channel.id, listenerUUID),
      )
    }

    const response = createDACPSuccessResponse(
      message,
      "privateChannelUnsubscribeEventListenerResponse",
    )

    sendDACPResponse({ response, instanceId, responses })
  } catch (error) {
    logger.error("DACP: Private channel unsubscribe event listener failed", error)
    const errorType = error instanceof FDC3ChannelError ? error.errorType : ChannelError.ApiTimeout
    const errorMessage =
      error instanceof Error ? error.message : "Failed to unsubscribe private channel listener"
    sendDACPErrorResponse({
      message,
      errorType,
      errorMessage,
      instanceId,
      responses,
    })
  }
}

/**
 * Remove all private channels for an instance (called on disconnect)
 */
export function removeInstancePrivateChannels(params: DACPHandlerParams): number {
  const { instanceId, getState, setState, responses } = params
  const state = getState()
  const privateChannels = Object.values(state.channels.private)
  const channelsToRemove = privateChannels.filter(channel =>
    channel.connectedInstances.includes(instanceId),
  )

  channelsToRemove.forEach(channel => {
    const contextListenersToRemove = Object.values(channel.contextListeners).filter(
      listener => listener.instanceId === instanceId,
    )

    notifyPrivateChannelUnsubscribeInternal(
      channel,
      contextListenersToRemove,
      instanceId,
      responses,
    )

    notifyPrivateChannelDisconnectInternal(channel, instanceId, responses)
    setState(state => disconnectInstanceFromPrivateChannel(state, channel.id, instanceId))
  })

  return channelsToRemove.length
}

export function notifyPrivateChannelAddContextListener(
  channelId: string,
  sourceInstanceId: string,
  contextType: string | null,
  params: DACPHandlerParams,
): void {
  const { getState, responses } = params
  const channel = getPrivateChannel(getState(), channelId)
  if (!channel) {
    return
  }

  const addListenerEvent = createDACPEvent("privateChannelOnAddContextListenerEvent", {
    privateChannelId: channelId,
    contextType,
  })

  Object.values(channel.addContextListenerListeners).forEach(listener => {
    if (listener.instanceId === sourceInstanceId) {
      return
    }

    const addListenerEventWithRouting = {
      ...addListenerEvent,
      meta: {
        ...addListenerEvent.meta,
        destination: { instanceId: listener.instanceId },
      },
    }

    responses.sendOutbound(addListenerEventWithRouting)
  })

  Object.values(channel.lifecycleCatchAllListeners).forEach(listener => {
    if (listener.instanceId === sourceInstanceId) {
      return
    }

    const addListenerEventWithRouting = {
      ...addListenerEvent,
      meta: {
        ...addListenerEvent.meta,
        destination: { instanceId: listener.instanceId },
      },
    }

    responses.sendOutbound(addListenerEventWithRouting)
  })
}

export function notifyPrivateChannelUnsubscribe(
  channelId: string,
  listenerId: string,
  contextType: string | null,
  sourceInstanceId: string,
  params: DACPHandlerParams,
): void {
  const { getState, responses } = params
  const channel = getPrivateChannel(getState(), channelId)
  if (!channel) {
    return
  }

  notifyPrivateChannelUnsubscribeInternal(
    channel,
    [
      {
        listenerId,
        instanceId: sourceInstanceId,
        contextType,
      },
    ],
    sourceInstanceId,
    responses,
  )
}

function notifyPrivateChannelUnsubscribeInternal(
  channel: NonNullable<ReturnType<typeof getPrivateChannel>>,
  contextListenersToRemove: Array<{
    listenerId: string
    instanceId: string
    contextType: string | null
  }>,
  sourceInstanceId: string,
  responses: DacpResponseDispatcher,
): void {
  if (contextListenersToRemove.length === 0) {
    return
  }

  const unsubscribeListeners = [
    ...Object.values(channel.unsubscribeListeners),
    ...Object.values(channel.lifecycleCatchAllListeners),
  ]

  contextListenersToRemove.forEach(listener => {
    const unsubscribeEvent = createDACPEvent("privateChannelOnUnsubscribeEvent", {
      privateChannelId: channel.id,
      contextType: listener.contextType ?? null,
    })

    unsubscribeListeners.forEach(unsubscribeListener => {
      if (unsubscribeListener.instanceId === sourceInstanceId) {
        return
      }

      const unsubscribeEventWithRouting = {
        ...unsubscribeEvent,
        meta: {
          ...unsubscribeEvent.meta,
          destination: { instanceId: unsubscribeListener.instanceId },
        },
      }

      responses.sendOutbound(unsubscribeEventWithRouting)
    })
  })
}

function notifyPrivateChannelDisconnectInternal(
  channel: NonNullable<ReturnType<typeof getPrivateChannel>>,
  sourceInstanceId: string,
  responses: DacpResponseDispatcher,
): void {
  const disconnectListeners = [
    ...Object.values(channel.disconnectListeners),
    ...Object.values(channel.lifecycleCatchAllListeners),
  ]

  disconnectListeners.forEach(listener => {
    if (listener.instanceId === sourceInstanceId) {
      return
    }

    // `PrivateChannelOnDisconnectEventPayload` defines only `privateChannelId`.
    const disconnectEvent = createDACPEvent("privateChannelOnDisconnectEvent", {
      privateChannelId: channel.id,
    })

    const disconnectEventWithRouting = {
      ...disconnectEvent,
      meta: {
        ...disconnectEvent.meta,
        destination: { instanceId: listener.instanceId },
      },
    }

    responses.sendOutbound(disconnectEventWithRouting)
  })
}
