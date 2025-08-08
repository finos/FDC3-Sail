import { v4 as uuid } from "uuid"
import {
  DA_HELLO,
  DA_DIRECTORY_LISTING,
  DA_REGISTER_APP_LAUNCH,
  SAIL_CLIENT_STATE,
  DesktopAgentHelloArgs,
  DesktopAgentDirectoryListingArgs,
  DesktopAgentRegisterAppLaunchArgs,
  SailClientStateArgs,
  CHANNEL_RECEIVER_UPDATE,
  ChannelReceiverUpdate,
  TabDetail,
} from "@finos/fdc3-sail-common"
import { State } from "@finos/fdc3-web-impl"
import { SailServerContext } from "../sailServerContext"
import { AppDirectoryManager } from "../../app-directory/appDirectoryManager"
import { SailFDC3Server } from "../sailFDC3Server"
import { SailData } from "../sailServerContext"
import {
  SocketIOCallback,
  HandlerContext,
  SocketType,
  CONFIG,
  PanelData,
  getFdc3ServerInstance,
  handleCallbackError,
} from "./types"

/**
 * Handles Desktop Agent hello messages for session setup and management
 * @param desktopAgentHelloArgs - Desktop agent hello arguments with session configuration
 * @param callback - Socket callback to confirm session creation
 * @param context - Handler context with socket, connection state, and sessions
 */
async function handleDesktopAgentHello(
  desktopAgentHelloArgs: DesktopAgentHelloArgs,
  callback: SocketIOCallback<boolean>,
  { socket, connectionState, sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL DA HELLO: ${JSON.stringify(desktopAgentHelloArgs)}`)

  connectionState.socketType = SocketType.DESKTOP_AGENT
  connectionState.userSessionId = desktopAgentHelloArgs.userSessionId
  console.log("SAIL Desktop Agent Connecting", connectionState.userSessionId)

  const existingServer = sessions.get(desktopAgentHelloArgs.userSessionId)

  let fdc3Server: SailFDC3Server
  if (existingServer) {
    // Reconfigure existing session
    fdc3Server = new SailFDC3Server(
      existingServer.serverContext,
      desktopAgentHelloArgs,
    )
    await fdc3Server.initializeDirectories(desktopAgentHelloArgs.directories)
    sessions.set(desktopAgentHelloArgs.userSessionId, fdc3Server)
    console.log(
      "SAIL updated desktop agent channels and directories",
      sessions.size,
      desktopAgentHelloArgs.userSessionId,
    )
  } else {
    // Create new session
    const serverContext = new SailServerContext(
      new AppDirectoryManager(),
      socket,
    )
    fdc3Server = new SailFDC3Server(serverContext, desktopAgentHelloArgs)
    serverContext.setFDC3Server(fdc3Server)
    await fdc3Server.initializeDirectories(desktopAgentHelloArgs.directories)
    sessions.set(desktopAgentHelloArgs.userSessionId, fdc3Server)
    console.log(
      "SAIL created agent session. Running sessions:",
      sessions.size,
      desktopAgentHelloArgs.userSessionId,
    )
  }

  connectionState.fdc3ServerInstance = fdc3Server
  callback(true)
}

/**
 * Handles directory listing requests to retrieve available applications
 * @param directoryListingArgs - Directory listing arguments with user session ID
 * @param callback - Socket callback to return directory apps or error
 * @param context - Handler context with sessions map
 */
async function handleDirectoryListing(
  directoryListingArgs: DesktopAgentDirectoryListingArgs,
  callback: SocketIOCallback<unknown>,
  { sessions }: HandlerContext,
): Promise<void> {
  const { userSessionId } = directoryListingArgs
  try {
    const fdc3Server = await getFdc3ServerInstance(sessions, userSessionId)
    const directoryAppList = fdc3Server.getDirectory().allApps
    callback(directoryAppList)
  } catch (error) {
    console.error("Session not found", userSessionId, error)
    handleCallbackError(callback, "Session not found")
  }
}

/**
 * Handles app launch registration requests to prepare app instances
 * @param appLaunchArgs - App launch registration arguments with app and hosting info
 * @param callback - Socket callback to return instance ID or error
 * @param context - Handler context with sessions map
 */
async function handleRegisterAppLaunch(
  appLaunchArgs: DesktopAgentRegisterAppLaunchArgs,
  callback: SocketIOCallback<string>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL DA REGISTER APP LAUNCH: ${JSON.stringify(appLaunchArgs)}`)

  const { appId, userSessionId, hosting, channel, instanceTitle } =
    appLaunchArgs
  try {
    const fdc3Server = await getFdc3ServerInstance(sessions, userSessionId)
    const instanceId = `${CONFIG.APP_INSTANCE_PREFIX}${uuid()}`

    const instanceDetails: SailData = {
      instanceId,
      state: State.Pending,
      appId,
      hosting,
      channel,
      instanceTitle,
      channelSockets: [],
    }

    fdc3Server.serverContext.setInstanceDetails(instanceId, instanceDetails)
    console.log("SAIL Registered app", appId, instanceId)
    callback(instanceId)
  } catch (error) {
    console.error("SAIL Session not found", userSessionId, error)
    handleCallbackError(callback, "Session not found")
  }
}

/**
 * Updates panel channel assignments and notifies of changes
 * @param serverContext - Server context for managing instance details
 * @param panelList - List of panels with their channel assignments
 */
function updatePanelChannels(
  serverContext: SailServerContext,
  panelList: PanelData[],
): void {
  panelList.forEach(({ panelId, tabId: newChannel, title }) => {
    const instanceDetails = serverContext.getInstanceDetails(panelId)
    if (!instanceDetails) return

    const existingChannel = instanceDetails.channel

    // Update instance title
    const updatedDetails: SailData = {
      ...instanceDetails,
      instanceTitle: title,
    }
    serverContext.setInstanceDetails(panelId, updatedDetails)

    // Notify of channel change if different
    if (newChannel !== existingChannel) {
      serverContext.notifyUserChannelsChanged(panelId, newChannel)
    }
  })
}

/**
 * Updates channel data for all connected apps by broadcasting channel updates
 * @param serverContext - Server context for managing app connections
 * @param channelList - List of available channels/tabs
 */
async function updateConnectedAppsChannels(
  serverContext: SailServerContext,
  channelList: TabDetail[],
): Promise<void> {
  const connectedApps = await serverContext.getConnectedApps()

  connectedApps.forEach((app) => {
    const instanceDetails = serverContext.getInstanceDetails(app.instanceId)
    if (!instanceDetails) return

    const channelUpdate: ChannelReceiverUpdate = {
      tabs: channelList,
    }

    instanceDetails.channelSockets.forEach((channelSocket) => {
      channelSocket.emit(CHANNEL_RECEIVER_UPDATE, channelUpdate)
    })
  })
}

/**
 * Handles client state updates including directories, channels, and panels
 * @param clientStateArgs - Client state arguments with updated configuration
 * @param callback - Socket callback to confirm update success
 * @param context - Handler context with sessions map
 */
async function handleClientState(
  clientStateArgs: SailClientStateArgs,
  callback: SocketIOCallback<boolean>,
  { sessions }: HandlerContext,
): Promise<void> {
  console.log(`SAIL CLIENT STATE: ${JSON.stringify(clientStateArgs)}`)

  try {
    const fdc3Server = await getFdc3ServerInstance(
      sessions,
      clientStateArgs.userSessionId,
    )
    const { serverContext } = fdc3Server

    // Update directories and channels
    await serverContext.reloadAppDirectories(
      clientStateArgs.directories,
      clientStateArgs.customApps,
    )
    serverContext.updateChannelData(clientStateArgs.channels)

    // Update panel channels
    updatePanelChannels(serverContext, clientStateArgs.panels)

    // Update channel data for connected apps
    await updateConnectedAppsChannels(serverContext, clientStateArgs.channels)

    callback(true)
  } catch (error) {
    console.error("SAIL Client state update failed:", error)
    handleCallbackError(callback, "Session not found")
  }
}

/**
 * Registers desktop agent socket handlers
 */
export function registerDesktopAgentHandlers(context: HandlerContext): void {
  const { socket } = context

  socket.on(
    DA_HELLO,
    (
      desktopAgentHelloArgs: DesktopAgentHelloArgs,
      callback: SocketIOCallback<boolean>,
    ) => {
      handleDesktopAgentHello(desktopAgentHelloArgs, callback, context).catch(
        (error) => {
          console.error("Error handling desktop agent hello:", error)
          callback(false, "Failed to initialize desktop agent")
        },
      )
    },
  )

  socket.on(
    DA_DIRECTORY_LISTING,
    (
      directoryListingArgs: DesktopAgentDirectoryListingArgs,
      callback: SocketIOCallback<unknown>,
    ) => {
      handleDirectoryListing(directoryListingArgs, callback, context)
    },
  )

  socket.on(
    DA_REGISTER_APP_LAUNCH,
    (
      appLaunchArgs: DesktopAgentRegisterAppLaunchArgs,
      callback: SocketIOCallback<string>,
    ) => {
      handleRegisterAppLaunch(appLaunchArgs, callback, context)
    },
  )

  socket.on(
    SAIL_CLIENT_STATE,
    (
      clientStateArgs: SailClientStateArgs,
      callback: SocketIOCallback<boolean>,
    ) => {
      handleClientState(clientStateArgs, callback, context)
    },
  )
}
