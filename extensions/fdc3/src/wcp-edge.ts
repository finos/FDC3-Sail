import {
  SERVER_INSTANCE,
  type SailPlatformBus,
  type SessionService,
} from "@finos/sail-platform"

type PortEntry = {
  port: MessagePort
  /** Temp id until WCP4; may be remapped. */
  instanceId: string
}

export type StartWcpBusEdgeOptions = {
  /** Resolve which session owns an app (required for inbound `post`). */
  sessions: SessionService
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

  const { sessions } = options
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
    const session = sessions.getSessionByApp(id)
    if (!session) {
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
      return
    }

    const hello = data as {
      meta: { connectionAttemptUuid: string }
      payload?: { fdc3Version?: string }
    }
    const connectionAttemptUuid = hello.meta.connectionAttemptUuid
    const tempId = `temp-${connectionAttemptUuid}`
    const channel = new MessageChannel()
    const port = channel.port2

    const entry: PortEntry = { port, instanceId: tempId }
    byInstance.set(tempId, entry)
    byPort.set(port, tempId)

    port.start()
    port.addEventListener("message", ev => onPortMessage(byPort.get(port) ?? tempId, ev))

    const requested = hello.payload?.fdc3Version
    const fdc3Version =
      requested === "3.0" || requested === "2.2" || requested === "2.1" || requested === "2.0"
        ? requested
        : "2.2"

    const handshake = {
      type: "WCP3Handshake",
      meta: {
        connectionAttemptUuid,
        timestamp: new Date().toISOString(),
      },
      payload: {
        fdc3Version,
        intentResolverUrl: false,
        channelSelectorUrl: false,
      },
    }

    ;(event.source as Window).postMessage(handshake, event.origin, [channel.port1])
  }

  window.addEventListener("message", onWindowMessage)

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
