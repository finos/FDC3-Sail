/**
 * Unified Agent State Types
 *
 * This file defines all types used in the functional state management system.
 * Types are designed to be JSON-serializable (using Records instead of Maps,
 * arrays instead of Sets).
 */

import type { AppIdentifier, AppMetadata, Context } from "@finos/fdc3"
import type { BrowserTypes } from "@finos/fdc3"
import type { DirectoryApp } from "../app-directory/types"

// ============================================================================
// APP INSTANCE TYPES
// ============================================================================

/**
 * An {@link AppIdentifier} for a *running* instance, so `instanceId` is always known.
 *
 * FDC3 leaves `instanceId` optional because the same type addresses both an app and one of
 * its instances; anywhere Sail has already resolved an instance, use this instead.
 */
export type RunningAppIdentifier = AppIdentifier & { readonly instanceId: string }

/**
 * FDC3 App Instance connection states
 */
export enum AppInstanceState {
  PENDING = "pending", // Host pre-register before WCP5 completes (Sail extension)
  CONNECTED = "connected", // WCP5 handshake complete; instance ready for DACP
}

/**
 * Stored registration for `addContextListener` (same fields as
 * {@link BrowserTypes.AddContextListenerRequestPayload}), after normalization:
 * `null` context type becomes `"*"`; null/empty `channelId` is omitted (listen on current user channel).
 */
export type InstanceContextListener = {
  contextType: NonNullable<BrowserTypes.AddContextListenerRequestPayload["contextType"]>
  channelId?: NonNullable<BrowserTypes.AddContextListenerRequestPayload["channelId"]>
}

/**
 * Instance-disambiguation fields — the FDC3 `AppMetadata.instanceMetadata` slot.
 *
 * Not derived from {@link AppMetadata} because FDC3 types that slot with an `any` index
 * signature; `unknown` keeps host-supplied extras honest at the read site.
 */
export interface InstanceMetadata {
  title?: string
  parentInstanceId?: string
  [key: string]: unknown
}

/**
 * Directory-sourced descriptive metadata for an instance.
 *
 * Identity (`appId` / `instanceId`) lives on {@link AppInstance} itself and instance
 * disambiguation in {@link AppInstance.instanceMetadata}, so those slots are omitted here
 * rather than stored a second time with nothing keeping the two copies in sync.
 */
export type AppInstanceMetadata = Omit<AppMetadata, "appId" | "instanceId" | "instanceMetadata">

/**
 * Core FDC3 app instance information
 */
export interface AppInstance {
  /** Unique instance identifier */
  instanceId: string

  /** FDC3 app identifier */
  appId: string

  /** Descriptive app metadata from directory (identity omitted — see {@link AppInstanceMetadata}) */
  metadata: AppInstanceMetadata

  /** Current connection state */
  state: AppInstanceState

  /** Instance creation timestamp */
  createdAt: Date

  /**
   * Monotonic per-agent registration order, assigned from `AgentState.nextInstanceSequence` at
   * `connectInstance`. `createdAt` alone cannot totally order two instances registered in the same
   * millisecond — routine for concurrent same-appId launches — so this is the true tiebreaker.
   */
  registrationSequence: number

  /** Last activity timestamp for heartbeat tracking */
  lastActivity: Date

  /** Current user channel from joinUserChannel / leave (never an app channel) */
  currentUserChannel: string | null

  /** Context listeners keyed by listener UUID */
  contextListeners: Record<string, InstanceContextListener>

  /** Array of private channel IDs this instance has access to */
  privateChannels: string[]

  /** Instance-specific metadata */
  instanceMetadata?: InstanceMetadata
}

// ============================================================================
// INTENT TYPES
// ============================================================================

/**
 * Intent listener registration information
 */
export interface IntentListener {
  /** Unique listener identifier */
  listenerId: string

  /** Intent name being listened for */
  intentName: string

  /** Instance that registered this listener */
  instanceId: string

  /** App that owns this listener */
  appId: string

  /** Context types this listener can handle (empty = all types) */
  contextTypes: string[]

  /** Optional result type this listener produces */
  resultType?: string

  /** Registration timestamp */
  registeredAt: Date

  /** Last activity timestamp */
  lastActivity: Date

  /** Whether this listener is currently active */
  active: boolean

  /** Custom listener metadata */
  metadata?: Record<string, unknown>
}

/** Which DACP request raised the intent; decides the response message type. */
export type IntentRequestType = "raiseIntentRequest" | "raiseIntentForContextRequest"

/**
 * Pending intent - tracks intents waiting for results
 * Note: timeout handles are NOT stored in state (not serializable).
 * They are managed in `handlers/intents/intent-pending-timeout-registry.ts`.
 */
export interface PendingIntent {
  /** Original request ID */
  requestId: string

  /** Intent name */
  intentName: string

  /** Context passed to the intent */
  context: Context

  /** Source app that raised the intent */
  sourceInstanceId: string

  /** Target app handling the intent */
  targetInstanceId: string

  /** Target app ID */
  targetAppId: string

  /** When the intent was raised */
  raisedAt: Date

  /** Which request raised it, so the response type matches */
  requestType?: IntentRequestType

  /** Set once the intentEvent reached the target; sole double-delivery guard */
  delivered?: boolean
}

// ============================================================================
// CHANNEL TYPES
// ============================================================================

/**
 * Stored context with metadata
 */
export interface StoredContext {
  context: Context
  /** Epoch timestamp in milliseconds. */
  timestampMs: number
  /** Sequence to preserve order within the same millisecond. */
  sequence: number
  sourceInstanceId: string
}

/**
 * Private channel registry entry — the agent-side state of a private channel.
 *
 * Named `PrivateChannelState`, not `PrivateChannel`, so it never shadows the app-facing
 * `PrivateChannel` interface from `@finos/fdc3`. `id` and `displayMetadata` are inherited
 * from {@link BrowserTypes.Channel}; only `type` is restated, to narrow it.
 */
export interface PrivateChannelState extends BrowserTypes.Channel {
  /** Type is always 'private' */
  type: "private"

  /** App that created the channel */
  creatorAppId: string

  /** App instance that created the channel */
  creatorInstanceId: string

  /** When the channel was created */
  createdAt: Date

  /** Array of instance IDs currently connected to this channel */
  connectedInstances: string[]

  /** Context listeners registered on this channel */
  contextListeners: Record<string, PrivateChannelContextListener>

  /** Event listeners for `addContextListener` events ({@link BrowserTypes.PrivateChannelEventType}) */
  addContextListenerListeners: Record<string, PrivateChannelListener>

  /** Event listeners for `unsubscribe` events */
  unsubscribeListeners: Record<string, PrivateChannelListener>

  /** Event listeners for `disconnect` events */
  disconnectListeners: Record<string, PrivateChannelListener>

  /**
   * FDC3 2.2: PrivateChannel.addEventListener(null, handler) — one listener receives
   * add-context-listener, unsubscribe, and disconnect lifecycle events.
   */
  lifecycleCatchAllListeners: Record<string, PrivateChannelListener>

  /** Last context broadcast per context type */
  lastContextByType: Record<string, Context>
}

/**
 * A listener registered on a private channel: which instance owns which listener id.
 *
 * One shape for every {@link BrowserTypes.PrivateChannelEventType} — `addContextListener`,
 * `unsubscribe` and `disconnect` all record exactly this. Which event a registration is for
 * is carried by the field it lives in on {@link PrivateChannelState}, not by its type.
 */
export interface PrivateChannelListener {
  listenerId: string
  instanceId: string
}

/**
 * Context listener on a private channel.
 */
export interface PrivateChannelContextListener extends PrivateChannelListener {
  contextType: string | null // null means all types
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * DA-level event listener registration (`fdc3.addEventListener`).
 *
 * Named `AgentEventListener`, not `EventListener`, so it never shadows the DOM global of
 * that name. `eventType` stays a plain `string` rather than `FDC3EventTypes`: handlers
 * normalize `"USER_CHANNEL_CHANGED"` to `"channelChanged"` and use an `"all"` sentinel for
 * `addEventListener(null)` — see `ALL_DA_EVENT_TYPES`.
 */
export interface AgentEventListener {
  listenerId: string
  instanceId: string
  eventType: string
}

// ============================================================================
// HEARTBEAT TYPES
// ============================================================================

/**
 * Heartbeat state for an instance
 */
export interface HeartbeatState {
  instanceId: string
  lastHeartbeatSent: number
  lastAcknowledgmentReceived: number
  missedHeartbeats: number
}

// ============================================================================
// OPEN WITH CONTEXT TYPES
// ============================================================================

/**
 * Pending open-with-context request awaiting listener registration.
 * Stored in state without timer handles so it remains serializable.
 */
export interface PendingOpenWithContext {
  message: BrowserTypes.OpenRequest
  appIdentifier: BrowserTypes.AppIdentifier
  /**
   * Absent for a plain `open()` (no context). Such an entry settles when the target instance
   * connects (WCP5), not when it registers a context listener.
   */
  launchContext?: Context
  sourceInstanceId: string
}

// ============================================================================
// APP DIRECTORY STATE
// ============================================================================

/** Launchable app catalog — separate from runtime instances keyed by instanceId. */
export interface AppDirectoryState {
  apps: DirectoryApp[]
  directoryUrls: string[]
}

/** Pre-WCP5 DACP routing id → validated instanceId (mint and host-adopt paths). */
export interface WcpHandshakeRoutingState {
  handshakeRoutingIdToInstanceId: Record<string, string>
}

// ============================================================================
// UNIFIED AGENT STATE
// ============================================================================

/**
 * Unified agent state containing all desktop agent state
 */
export interface AgentState {
  /** All app instances keyed by instanceId */
  instances: Record<string, AppInstance>

  /**
   * Next value to hand out as an `AppInstance.registrationSequence`. Per-agent (lives on state, not
   * a module-level variable) so it moves atomically with the instances it orders and stays isolated
   * across multiple agents in one process.
   */
  nextInstanceSequence: number

  /** Intent-related state */
  intents: {
    /** Intent listeners keyed by listenerId */
    listeners: Record<string, IntentListener>
    /** Pending intents keyed by requestId */
    pending: Record<string, PendingIntent>
  }

  /** Channel-related state */
  channels: {
    /** User channels (pre-defined FDC3 channels) keyed by channelId */
    user: Record<string, BrowserTypes.Channel>
    /** App channels (dynamically created) keyed by channelId */
    app: Record<string, BrowserTypes.Channel>
    /** Private channels keyed by channelId */
    private: Record<string, PrivateChannelState>
    /** Stored contexts: channelId -> contextType -> StoredContext */
    contexts: Record<string, Record<string, StoredContext>>
  }

  /** Event-related state */
  events: {
    /** Event listeners keyed by listenerId */
    listeners: Record<string, AgentEventListener>
    /** Index: eventType -> listenerIds */
    byEventType: Record<string, string[]>
  }

  /** Heartbeat state keyed by instanceId */
  heartbeats: Record<string, HeartbeatState>

  /** Open request coordination state */
  open: {
    /** Pending open-with-context requests keyed by target instanceId */
    pendingWithContext: Record<string, PendingOpenWithContext[]>
  }

  /** Launchable app directory (catalog), not runtime instances */
  appDirectory: AppDirectoryState

  /** WCP4 routing id → WCP5-validated instanceId links */
  wcpHandshakeRouting: WcpHandshakeRoutingState
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Function type for updating agent state.
 * Takes a transform function that receives the current state and returns the new state.
 *
 * @example
 * ```typescript
 * setState((state) => ({
 *   ...state,
 *   instances: { ...state.instances, [id]: newInstance }
 * }))
 * ```
 */
export type StateSetter = (callback: (state: AgentState) => AgentState) => void
