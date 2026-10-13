/**
 * This is a unique, long, unguessable string that identifies a particular instance of an app.
 * All messages arriving at the desktop agent will have this UUID attached to them.
 * It is important that this is unguessable as it is a shared secret used to identify the app
 * when reconnecting after navigation or refresh.
 */
export type InstanceID = string

/**
 * Negotiated FDC3 API / DACP wire version for an app connection.
 * "2.2" = FDC3 2.2.x wire format; "3.0" = FDC3 3.0 wire format.
 */
export type Fdc3ApiVersion = "2.2" | "3.0"

export const FDC3_API_VERSIONS: Fdc3ApiVersion[] = ["2.2", "3.0"]

export enum State {
  Pending /* App has started, but not completed FDC3 Handshake */,
  Connected /* App has completed FDC3 handshake */,
  NotResponding /* App has not responded to a heartbeat */,
  Terminated /* App has sent a termination message */,
}

/**
 * Feel free to extend this type with your own properties
 * if implementing your own FDC3ServerInstance.
 */
export type AppRegistration = {
  state: State
  appId: string
  instanceId: InstanceID
  fdc3Version?: Fdc3ApiVersion
}

/**
 * Incoming messages are version-specific; handlers narrow with their own BrowserTypes.
 */
export type ReceivableMessage = {
  type: string
}
