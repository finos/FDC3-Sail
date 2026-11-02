/**
 * Sail-specific App Directory hostManifest (`hostManifests.sail`).
 *
 * Cardinality:
 * - `autostart`: ensure at least one live instance of this appId
 * - `singleton`: allow at most one live instance of this appId
 *
 * `raiseIntent` / `raiseIntentForContext` targeting `{ appId }` (no
 * `instanceId`) launches a new instance, unless this app is a singleton
 * that is already running — then the live instance is reused.
 */

export type SailHostManifest = {
  forceNewWindow?: boolean
  invisible?: boolean
  singleton?: boolean
  autostart?: boolean
  searchable?: boolean
}

export type ResolvedSailHostManifest = {
  forceNewWindow: boolean
  invisible: boolean
  singleton: boolean
  autostart: boolean
  searchable: boolean
}

export const SAIL_HOST_MANIFEST_DEFAULTS: ResolvedSailHostManifest = {
  forceNewWindow: false,
  invisible: false,
  singleton: false,
  autostart: false,
  searchable: true,
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

/**
 * Normalize `hostManifests.sail` (object, JSON string, or missing) to defaults.
 */
export function parseSailHostManifest(raw: unknown): ResolvedSailHostManifest {
  let source: Record<string, unknown> = {}

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        source = parsed as Record<string, unknown>
      }
    } catch {
      source = {}
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    source = raw as Record<string, unknown>
  }

  return {
    forceNewWindow: asBoolean(source.forceNewWindow, SAIL_HOST_MANIFEST_DEFAULTS.forceNewWindow),
    invisible: asBoolean(source.invisible, SAIL_HOST_MANIFEST_DEFAULTS.invisible),
    singleton: asBoolean(source.singleton, SAIL_HOST_MANIFEST_DEFAULTS.singleton),
    autostart: asBoolean(source.autostart, SAIL_HOST_MANIFEST_DEFAULTS.autostart),
    searchable: asBoolean(source.searchable, SAIL_HOST_MANIFEST_DEFAULTS.searchable),
  }
}

/** Read and parse `hostManifests.sail` from an AppD record. */
export function sailHostManifestFromApp(app: {
  hostManifests?: { [key: string]: unknown }
}): ResolvedSailHostManifest {
  return parseSailHostManifest(app.hostManifests?.sail)
}

/** True when the AppD record sets `hostManifests.sail.singleton`. */
export function isSingletonDirectoryApp(
  app: { hostManifests?: { [key: string]: unknown } } | undefined,
): boolean {
  return app !== undefined && sailHostManifestFromApp(app).singleton
}
