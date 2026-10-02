import {
  DA_DIRECTORY_LISTING,
  APP_HELLO,
  DA_HELLO,
  FDC3_APP_EVENT,
  SAIL_CHANNEL_CHANGE,
  SAIL_APP_STATE,
  SAIL_CLIENT_STATE,
  DA_REGISTER_APP_LAUNCH,
  CHANNEL_RECEIVER_HELLO,
  SAIL_INTENT_RESOLVE_ON_CHANNEL,
} from "@finos/fdc3-sail-common"
import { ConnectionContext } from "./types"
import { SailFDC3ServerFactory } from "../SailFDC3ServerFactory"

/* eslint-disable  @typescript-eslint/no-explicit-any */

// Types and utilities
export {
  DEBUG_MODE,
  getSailUrl,
  getFdc3WebSocketUrl,
  toWebSocketUrl,
  ConnectionType,
  ConnectionContext,
  createConnectionContext,
} from "./types"

// Individual handlers
import { handleDAHello } from "./handleDAHello"
import { handleDirectoryListing } from "./handleDirectoryListing"
import { handleRegisterAppLaunch } from "./handleRegisterAppLaunch"
import { handleClientState } from "./handleClientState"
import { handleChannelChange } from "./handleChannelChange"
import { handleAppHello } from "./handleAppHello"
import { handleFDC3AppEvent } from "./handleFDC3AppEvent"
import { handleChannelReceiverHello } from "./handleChannelReceiverHello"
import { handleIntentResolveOnChannel } from "./handleIntentResolveOnChannel"
import { handleDisconnect } from "./handleDisconnect"
import { SocketIOConnection } from "../connection"

/**
 * Registers all message type handlers on a connection.
 * This sets up the complete FDC3 message handling for a single connection session.
 */
export function handleAllMessageTypes(
  ctx: ConnectionContext,
  factory: SailFDC3ServerFactory,
  connection: SocketIOConnection,
): void {
  connection.on(DA_HELLO, async (props: any, callback: any) => {
    await handleDAHello(ctx, factory, connection, props, callback)
  })

  connection.on(DA_DIRECTORY_LISTING, (props: any, callback: any) => {
    handleDirectoryListing(factory, props, callback)
  })

  connection.on(DA_REGISTER_APP_LAUNCH, (props: any, callback: any) => {
    handleRegisterAppLaunch(factory, props, callback)
  })

  connection.on(SAIL_CLIENT_STATE, async (props: any, callback: any) => {
    await handleClientState(factory, props, callback)
  })

  connection.on(SAIL_CHANNEL_CHANGE, async (props: any, callback: any) => {
    await handleChannelChange(factory, props, callback)
  })

  connection.on(APP_HELLO, (props: any, callback: any) => {
    handleAppHello(ctx, factory, connection, props, callback)
  })

  connection.on(FDC3_APP_EVENT, (data: any, from: any) => {
    handleFDC3AppEvent(ctx, data, from)
  })

  connection.on(CHANNEL_RECEIVER_HELLO, (props: any, callback: any) => {
    handleChannelReceiverHello(ctx, factory, connection, props, callback)
  })

  connection.on(SAIL_INTENT_RESOLVE_ON_CHANNEL, (props: any, callback: any) => {
    handleIntentResolveOnChannel(ctx, props, callback)
  })

  const reporter = setInterval(async () => {
    if (ctx.fdc3ServerInstance) {
      const state = await ctx.fdc3ServerInstance.getAllApps()
      connection.emit(SAIL_APP_STATE, state)
    }
  }, 3000)

  connection.on("disconnect", async () => {
    await handleDisconnect(ctx, factory)
    clearInterval(reporter)
  })
}
