import { v4 as uuid } from "uuid"
import {
  SAIL_CHANNEL_CHANGE,
  CHANNEL_RECEIVER_HELLO,
  SAIL_INTENT_RESOLVE_ON_CHANNEL,
  SailChannelChangeArgs,
  ChannelReceiverHelloRequest,
  ChannelReceiverUpdate,
  SailIntentResolveOpenChannelArgs,
} from "@finos/fdc3-sail-common"
import { BrowserTypes } from "@finos/fdc3"
import {
  SocketIOCallback,
  HandlerContext,
  SocketType,
  getFdc3ServerInstance,
  handleCallbackError,
  AppInstance,
} from "./types"
import { Socket } from "socket.io"

/**
 * Adds a channel socket to an existing app instance
 * @param appInstance - The app instance to update
 * @param socket - The socket to add
 * @returns Updated app instance with the new socket
 */
function addChannelSocketToInstance(
  appInstance: AppInstance,
  socket: Socket,
): AppInstance {
  return {
    ...appInstance,
    channelSockets: [...appInstance.channelSockets, socket],
  }
}

/**
 * Handles channel change requests for app instances
 * @param channelChangeArgs - Channel change arguments containing user session and instance info
 * @param callback - Socket callback to confirm success or return error
 * @param context - Handler context with sessions map
 */
async function handleChannelChange(
  channelChangeArgs: SailChannelChangeArgs,
  callback: SocketIOCallback<boolean>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL CHANNEL CHANGE: ${JSON.stringify(channelChangeArgs)}`)

  try {
    const fdc3Server = await getFdc3ServerInstance(
      sessions,
      channelChangeArgs.userSessionId,
    )

    const joinChannelRequest: BrowserTypes.JoinUserChannelRequest = {
      type: "joinUserChannelRequest",
      payload: {
        channelId: channelChangeArgs.channel || "",
      },
      meta: {
        requestUuid: uuid(),
        timestamp: new Date(),
      },
    }

    const response = await fdc3Server.receive(
      joinChannelRequest,
      channelChangeArgs.instanceId,
    )
    console.log(`SAIL JOIN USER CHANNEL RESPONSE: ${JSON.stringify(response)}`)

    await fdc3Server.serverContext.notifyUserChannelsChanged(
      channelChangeArgs.instanceId,
      channelChangeArgs.channel,
    )

    callback(true)
  } catch (error) {
    console.error("SAIL Channel change failed:", error)
    handleCallbackError(callback, "Channel change failed")
  }
}

/**
 * Handles channel receiver hello messages to establish channel communication
 * @param receiverHelloRequest - Channel receiver hello request with session and instance info
 * @param callback - Socket callback to return channel update or error
 * @param context - Handler context with socket, connection state, and sessions
 */
async function handleChannelReceiverHello(
  receiverHelloRequest: ChannelReceiverHelloRequest,
  callback: SocketIOCallback<ChannelReceiverUpdate>,
  { socket, connectionState, sessions }: HandlerContext,
): Promise<void> {
  connectionState.userSessionId = receiverHelloRequest.userSessionId
  connectionState.appInstanceId = receiverHelloRequest.instanceId
  connectionState.socketType = SocketType.CHANNEL

  try {
    const fdc3Server = await getFdc3ServerInstance(
      sessions,
      receiverHelloRequest.userSessionId,
    )
    const serverContext = fdc3Server.getServerContext()
    const appInstance = serverContext.getInstanceDetails(
      receiverHelloRequest.instanceId,
    )

    if (!appInstance) {
      handleCallbackError(callback, "No app found")
      return
    }

    // Add this socket to the app's channel sockets
    const mutableAppInstance = {
      ...appInstance,
      channelSockets: [...appInstance.channelSockets],
    }
    const updatedInstance = addChannelSocketToInstance(
      mutableAppInstance,
      socket,
    )
    // Ensure updatedInstance is typed as SailData
    serverContext.setInstanceDetails(receiverHelloRequest.instanceId, {
      ...appInstance,
      ...updatedInstance,
    })
    connectionState.fdc3ServerInstance = fdc3Server

    const channelUpdate: ChannelReceiverUpdate = {
      tabs: serverContext.getTabs(),
    }
    callback(channelUpdate)
  } catch (error) {
    console.error("Error handling channel receiver hello:", error)
    handleCallbackError(callback, "Server error")
  }
}

/**
 * Handles intent resolution on specific channels by opening apps on designated channels
 * @param intentResolveArgs - Intent resolve arguments containing app ID and channel
 * @param callback - Socket callback to confirm completion or return error
 * @param context - Handler context containing connection state
 */
function handleIntentResolveOnChannel(
  intentResolveArgs: SailIntentResolveOpenChannelArgs,
  callback: SocketIOCallback<void>,
  { connectionState }: HandlerContext,
): void {
  console.log(
    `SAIL INTENT RESOLVE ON CHANNEL: ${JSON.stringify(intentResolveArgs)}`,
  )

  const { fdc3ServerInstance } = connectionState
  if (!fdc3ServerInstance) {
    handleCallbackError(callback, "No server instance available")
    return
  }

  fdc3ServerInstance.serverContext.openOnChannel(
    intentResolveArgs.appId,
    intentResolveArgs.channel,
  )
  callback(null)
}

/**
 * Registers channel-specific socket handlers
 */
export function registerChannelHandlers(context: HandlerContext): void {
  const { socket } = context

  socket.on(
    SAIL_CHANNEL_CHANGE,
    (
      channelChangeArgs: SailChannelChangeArgs,
      callback: SocketIOCallback<boolean>,
    ) => {
      handleChannelChange(channelChangeArgs, callback, context)
    },
  )

  socket.on(
    CHANNEL_RECEIVER_HELLO,
    (
      receiverHelloRequest: ChannelReceiverHelloRequest,
      callback: SocketIOCallback<ChannelReceiverUpdate>,
    ) => {
      handleChannelReceiverHello(receiverHelloRequest, callback, context)
    },
  )

  socket.on(
    SAIL_INTENT_RESOLVE_ON_CHANNEL,
    (
      intentResolveArgs: SailIntentResolveOpenChannelArgs,
      callback: SocketIOCallback<void>,
    ) => {
      handleIntentResolveOnChannel(intentResolveArgs, callback, context)
    },
  )
}
