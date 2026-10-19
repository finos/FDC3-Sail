import type { AppConnectionMetadata, AppConnectionOptions } from "./wcp-types"

type WcpHostIdentifierResolver = Pick<AppConnectionOptions, "resolveHostIdentifier">

/**
 * Duck-typed connection owner used by DACP handlers that only know
 * {@link import("../../handlers/types").DacpResponseDispatcher.connectionOwner}.
 */
type AppConnectionHostLookup = {
  getConnection(instanceId: string): AppConnectionMetadata | undefined
  resolveHostIdentifierForSource?(source: Window): string | undefined
}

export function asAppConnectionHostLookup(owner: object): AppConnectionHostLookup | undefined {
  if (
    !("getConnection" in owner) ||
    typeof (owner as AppConnectionHostLookup).getConnection !== "function"
  ) {
    return undefined
  }
  return owner as AppConnectionHostLookup
}

/**
 * Resolve the host-assigned launcher instance id from a browsing context.
 * Prefers `window.name`; falls back to host {@link AppConnectionOptions.resolveHostIdentifier}.
 */
export function resolveHostIdentifierFromSource(
  sourceWindow: Window,
  options?: WcpHostIdentifierResolver,
): string | undefined {
  try {
    const fromName = sourceWindow.name || undefined
    if (fromName) {
      return fromName
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === "SecurityError")) {
      throw error
    }
  }

  return options?.resolveHostIdentifier?.(sourceWindow)
}

export function resolveConnectionHostIdentifier(
  connection:
    | {
        hostIdentifier?: string
        source?: Window
      }
    | undefined,
  options?: WcpHostIdentifierResolver,
): string | undefined {
  if (!connection) {
    return undefined
  }

  if (connection.hostIdentifier) {
    return connection.hostIdentifier
  }

  if (!connection.source) {
    return undefined
  }

  return resolveHostIdentifierFromSource(connection.source, options)
}

/**
 * Resolve launcher id for a routed instance and persist it on connection metadata
 * when WCP1 stored an empty/missing value (e.g. FINOS mock apps clear `window.name`).
 */
export function resolveAndPersistConnectionHostIdentifier(
  connectionOwner: object,
  instanceId: string,
): string | undefined {
  const owner = asAppConnectionHostLookup(connectionOwner)
  if (!owner) {
    return undefined
  }

  const connection = owner.getConnection(instanceId)
  const resolver = owner.resolveHostIdentifierForSource
    ? { resolveHostIdentifier: owner.resolveHostIdentifierForSource.bind(owner) }
    : undefined

  const resolved = resolveConnectionHostIdentifier(connection, resolver)
  if (resolved && connection && connection.hostIdentifier !== resolved) {
    connection.hostIdentifier = resolved
  }
  return resolved
}
