import {
  SERVER_INSTANCE,
  type SailPlatformBus,
  type SailUserSession,
  type SessionService,
} from "@finos/sail-platform"

type PortEntry = {
  port: MessagePort
  /** Host instance id when known; otherwise temp-* until identity remap. */
  instanceId: string
}

export type StartWcpBusEdgeOptions = {
  /** Resolve which session owns an app (required for inbound `post`). */
  sessions: SessionService
  /**
   * Called after WCP3Handshake with the host instance id (when known) and the
   * negotiated FDC3 wire version from WCP1Hello.
   */
  onNegotiatedVersion?: (instanceId: string, fdc3Version: string) => void
}

function tryReadWindowName(source: MessageEventSource): string | undefined {
  try {
    const name = (source as Window).name
    return typeof name === "string" && name.length > 0 ? name : undefined
  } catch {
    return undefined
  }
}

/**
 * Map the hello sender to the session instance launched for that Window.
 * Prefer the WeakMap registration; fall back to iframe/`window.name` (hosts set
 * this to the instance id). Cross-origin-safe: `name` is readable on WindowProxy.
 */
function resolveHostInstanceId(
  sessions: SessionService,
  source: MessageEventSource,
): string | undefined {
  const session = sessions.getSession()
  if (!session) {
    return undefined
  }
  try {
    const fromMap = session.getInstanceIdForHostWindow(source as Window)
    if (fromMap) {
      return fromMap
    }
  } catch {
    // ignore
  }
  const fromName = tryReadWindowName(source)
  if (fromName && session.getSnapshot().apps.some(a => a.instanceId === fromName)) {
    // Heal the WeakMap if registration raced behind WCP1Hello.
    try {
      session.registerHostWindow(source as Window, fromName)
    } catch {
      // ignore
    }
    return fromName
  }
  return fromName
}

function sessionForApp(
  sessions: SessionService,
  instanceId: string,
): SailUserSession | undefined {
  return sessions.getSessionByApp(instanceId) ?? sessions.getSession()
}

/**
 * Minimal browser WCP1–3 edge: MessagePorts ↔ {@link SailPlatformBus}.
 * App → DA: `post(msg, SERVER_INSTANCE)` (source on message meta).
 * DA → App: subscribe and deliver when `instanceId` matches a port.
 */
export function startWcpBusEdge(
  bus: SailPlatformBus,
  options: StartWcpBusEdgeOptions,
): () => void {
  if (typeof window === "undefined" || typeof MessageChannel === "undefined") {
    return () => {
      /* no-op */
    }
  }

  const { sessions, onNegotiatedVersion } = options
  const byInstance = new Map<string, PortEntry>()
  const byPort = new WeakMap<MessagePort, string>()
  /** Avoid echoing a port→bus post straight back onto the same port. */
  let publishing = 0

  const onPortMessage = (instanceId: string, event: MessageEvent) => {
    const data = event.data
    if (data === null || typeof data !== "object") {
      return
    }
    const message = data as object
    const meta = (message as { meta?: { source?: { instanceId?: string } } }).meta
    const id = meta?.source?.instanceId ?? instanceId
    if (id !== instanceId && byInstance.has(instanceId)) {
      const entry = byInstance.get(instanceId)!
      byInstance.delete(instanceId)
      entry.instanceId = id
      byInstance.set(id, entry)
      byPort.set(entry.port, id)
    }
    // Single-user hosts: fall back to getSession() so WCP4 on a temp port is not dropped.
    if (!sessionForApp(sessions, id)) {
      bus.log(`[sail.fdc3.wcp] no session for app ${id}; dropping inbound`)
      return
    }
    const withSource =
      meta?.source?.instanceId === id
        ? message
        : {
            ...message,
            meta: {
              ...(meta ?? {}),
              source: { ...(meta?.source ?? {}), instanceId: id },
            },
          }
    publishing++
    void bus.post(withSource, SERVER_INSTANCE).finally(() => {
      publishing--
    })
  }

  const unsubBus = bus.subscribe((message, instanceId) => {
    if (publishing > 0 || instanceId === SERVER_INSTANCE) {
      return
    }
    const entry = byInstance.get(instanceId)
    if (!entry) {
      return
    }
    try {
      entry.port.postMessage(message)
    } catch (err) {
      bus.log(`[sail.fdc3.wcp] post to ${instanceId} failed: ${String(err)}`)
    }
  })

  const onWindowMessage = (event: MessageEvent) => {
    const data = event.data
    if (data === null || typeof data !== "object") {
      return
    }
    if ((data as { type?: string }).type !== "WCP1Hello") {
      return
    }
    if (!event.source || !event.origin) {
      bus.log(
        `[sail.fdc3.wcp] WCP1Hello ignored — missing source/origin (source=${Boolean(event.source)} origin=${event.origin || ""})`,
      )
      return
    }

    const hello = data as {
      meta?: { connectionAttemptUuid?: string }
      payload?: { fdc3Version?: string }
    }
    const connectionAttemptUuid = hello.meta?.connectionAttemptUuid
    if (!connectionAttemptUuid) {
      bus.log("[sail.fdc3.wcp] WCP1Hello ignored — missing connectionAttemptUuid")
      return
    }

    const resolved = resolveHostInstanceId(sessions, event.source)
    const instanceId = resolved ?? `temp-${connectionAttemptUuid}`
    if (!resolved) {
      bus.log(
        `[sail.fdc3.wcp] WCP1Hello with unresolved host window — using ${instanceId}`,
      )
    }

    // Replace any prior port for this instance (iframe reload / re-hello).
    const prior = byInstance.get(instanceId)
    if (prior) {
      try {
        prior.port.close()
      } catch {
        // ignore
      }
      byInstance.delete(instanceId)
    }

    const channel = new MessageChannel()
    const port = channel.port2

    const entry: PortEntry = { port, instanceId }
    byInstance.set(instanceId, entry)
    byPort.set(port, instanceId)

    port.start()
    port.addEventListener("message", ev => onPortMessage(byPort.get(port) ?? instanceId, ev))

    const requested = hello.payload?.fdc3Version
    const fdc3Version =
      requested === "3.0" || requested === "2.2" || requested === "2.1" || requested === "2.0"
        ? requested
        : "2.2"

    const handshake = {
      type: "WCP3Handshake",
      meta: {
        connectionAttemptUuid,
        timestamp: new Date(),
      },
      payload: {
        fdc3Version,
        intentResolverUrl: false,
        channelSelectorUrl: false,
      },
    }

    try {
      ;(event.source as Window).postMessage(handshake, event.origin, [channel.port1])
      bus.log(
        `[sail.fdc3.wcp] WCP3Handshake → ${event.origin} (instance=${instanceId}, fdc3=${fdc3Version})`,
      )
      if (!instanceId.startsWith("temp-")) {
        try {
          onNegotiatedVersion?.(instanceId, fdc3Version)
        } catch {
          // ignore listener errors
        }
      }
    } catch (err) {
      bus.log(`[sail.fdc3.wcp] WCP3Handshake postMessage failed: ${String(err)}`)
      try {
        port.close()
      } catch {
        // ignore
      }
      byInstance.delete(instanceId)
    }
  }

  window.addEventListener("message", onWindowMessage)
  bus.log("[sail.fdc3.wcp] listening for WCP1Hello")

  return () => {
    window.removeEventListener("message", onWindowMessage)
    unsubBus()
    for (const entry of [...byInstance.values()]) {
      try {
        entry.port.close()
      } catch {
        // ignore
      }
    }
    byInstance.clear()
  }
}
