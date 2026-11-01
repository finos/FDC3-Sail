import { AppHosting, AppHelloArgs, parseSailHostManifest } from "../../../common"
import { State, WebAppDetails } from "@finos/sail-headless-agent"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"
import { SailData } from "../SailFDC3ServerInstance"
import { Connection } from "../connection/Connection"
import { ConnectionContext, ConnectionType, DEBUG_MODE } from "./types"
import { createLogger } from "../../logger"

const log = createLogger("AppHello")

/* eslint-disable  @typescript-eslint/no-explicit-any */

let debugReconnectionNumber = 0

/**
 * Handle APP_HELLO message
 */
export function handleAppHello(
  ctx: ConnectionContext,
  factory: SailFDC3ServerFactory,
  connection: Connection,
  props: AppHelloArgs,
  callback: (success: any, err?: string) => void,
): void {
  log.debug({ props }, "APP_HELLO received")

  ctx.appInstanceId = props.instanceId
  ctx.userSessionId = props.userSessionId
  ctx.connectionType = ConnectionType.APP

  const fdc3Server = factory.getSession(ctx.userSessionId)

  if (fdc3Server != undefined) {
    log.debug(
      { userSessionId: ctx.userSessionId, appInstanceId: ctx.appInstanceId },
      "App connected",
    )
    const appInstance = fdc3Server.getInstanceDetails(ctx.appInstanceId)
    const directoryApp = fdc3Server.directory.retrieveAppsById(props.appId)[0]
    const directoryUrl = (directoryApp?.details as WebAppDetails | undefined)?.url
    if (appInstance != undefined && appInstance.state == State.Pending) {
      const url = directoryUrl ?? appInstance.url
      if (!url) {
        log.error(
          { appInstanceId: ctx.appInstanceId, appId: props.appId },
          "App hello: directory record unavailable and instance has no url",
        )
        return callback(null, "App not found in directory")
      }
      appInstance.connection = connection
      appInstance.url = url
      appInstance.fdc3Version = props.fdc3Version ?? "2.2"
      ctx.fdc3ServerInstance = fdc3Server
      ctx.fdc3ServerInstance.setInstanceDetails(ctx.appInstanceId, appInstance)
      return callback(appInstance.hosting)
    } else if (DEBUG_MODE && directoryApp && directoryUrl) {
      log.warn(
        { appInstanceId: ctx.appInstanceId, appId: props.appId },
        "App tried to connect with invalid instance id, allowing connection anyway",
      )

      const shm = parseSailHostManifest(directoryApp.hostManifests?.sail)

      const instanceDetails: SailData = {
        appId: props.appId,
        instanceId: ctx.appInstanceId,
        state: State.Pending,
        fdc3Version: props.fdc3Version ?? "2.2",
        connection,
        url: directoryUrl,
        hosting: shm.forceNewWindow ? AppHosting.Tab : AppHosting.Frame,
        channel: null,
        instanceTitle: directoryApp.title + " - RECOVERED " + debugReconnectionNumber++,
        channelConnections: [],
      }

      fdc3Server.setInstanceDetails(ctx.appInstanceId, instanceDetails)

      ctx.fdc3ServerInstance = fdc3Server
      return callback(instanceDetails.hosting)
    }

    log.error(
      { appInstanceId: ctx.appInstanceId, appId: props.appId, inDirectory: Boolean(directoryApp) },
      directoryApp
        ? "App tried to connect with invalid instance id"
        : "App hello: appId not in directory",
    )
    return callback(null, directoryApp ? "Invalid instance id" : "App not found in directory")
  } else {
    log.error(
      { userSessionId: ctx.userSessionId, appInstanceId: ctx.appInstanceId },
      "App tried connecting to non-existent DA instance",
    )
    callback(null, "App Tried Connecting to non-existent DA Instance")
  }
}
