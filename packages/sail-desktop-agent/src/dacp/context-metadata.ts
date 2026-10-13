/**
 * FDC3 3.0 `ContextMetadata`: what the Desktop Agent attaches to every context and intent it
 * delivers.
 *
 * The agent owns `source` and `timestamp`. The sending app may supply `traceId`, `signature`,
 * `antiReplay` and `custom` (`AppProvidableContextMetadata`), which the agent MUST forward
 * unchanged. When the app sends no `traceId` the agent generates one.
 */

import type { AppIdentifier, BrowserTypes } from "@finos/fdc3"

/** `ContextMetadata` as it travels in DACP: the timestamp is an ISO-8601 string on the wire. */
export type WireContextMetadata = Omit<BrowserTypes.ContextMetadata, "timestamp"> & {
  timestamp: string
}

type AppProvidableContextMetadata = BrowserTypes.AppProvidableContextMetadata

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDetachedSignature(value: unknown): value is BrowserTypes.DetachedSignature {
  return (
    isRecord(value) && typeof value.protected === "string" && typeof value.signature === "string"
  )
}

function isAntiReplayClaims(value: unknown): value is BrowserTypes.AntiReplayClaims {
  return (
    isRecord(value) &&
    typeof value.iat === "number" &&
    typeof value.exp === "number" &&
    typeof value.jti === "string"
  )
}

/**
 * Keeps only the fields an app is allowed to provide. Anything else — notably `source` and
 * `timestamp` — is dropped, so an app cannot pose as another app.
 */
export function pickAppProvidableMetadata(raw: unknown): AppProvidableContextMetadata | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const picked: AppProvidableContextMetadata = {
    ...(typeof raw.traceId === "string" && raw.traceId.length > 0 && { traceId: raw.traceId }),
    ...(isDetachedSignature(raw.signature) && { signature: raw.signature }),
    ...(isAntiReplayClaims(raw.antiReplay) && { antiReplay: raw.antiReplay }),
    ...(isRecord(raw.custom) && { custom: raw.custom }),
  }
  return Object.keys(picked).length > 0 ? picked : undefined
}

/** Agent-generated `source`, `timestamp` and `traceId`, plus the app's forwarded fields. */
export function buildContextMetadata(
  source: AppIdentifier,
  appMetadata?: AppProvidableContextMetadata,
  timestamp: string = new Date().toISOString(),
): WireContextMetadata {
  return {
    ...appMetadata,
    source: {
      appId: source.appId,
      ...(source.instanceId && { instanceId: source.instanceId }),
    },
    timestamp,
    traceId: appMetadata?.traceId ?? crypto.randomUUID(),
  }
}
