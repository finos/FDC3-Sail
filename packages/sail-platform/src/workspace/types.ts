// ============================================================================
// WORKSPACES AND LAYOUTS
// ============================================================================
//
// Two questions, two types:
//
//   Workspace — *what* is loaded: a named, saveable set of running apps.
//   Layout    — *how it looks*: how those apps are grouped and arranged.
//
// Both are UI-agnostic. A host that renders one container with every app inside
// it, and a host that renders tabbed frames driven by a layout library, describe
// themselves with the same types.
//
// ============================================================================

/**
 * How a layout's arrangement is stored.
 *
 * Exactly one lane, chosen by the host. The union exists so the two cannot be
 * used at once — two sources of truth for the same arrangement is how saved
 * layouts silently diverge between hosts.
 *
 * - `renderer` — arrangement is owned by a layout library (Dockview,
 *   golden-layout, …) and opaque to the platform. The platform stores and
 *   returns `state` untouched.
 * - `rects` — arrangement is plain coordinates the platform understands, held
 *   on each {@link Panel.rect}. For hosts with no layout library.
 */
export type Geometry = { mode: "renderer"; state: unknown } | { mode: "rects" }

/** Position and size of a panel, used when {@link Geometry} is `rects`. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * One running app in a workspace.
 *
 * `appId` identifies the app in a directory; `url` is what the host actually
 * mounts. Both are plain strings — the platform holds no FDC3 types.
 */
export interface Panel {
  id: string
  appId: string
  title: string
  url: string
  icon?: string

  /** Set only when the layout's {@link Geometry} is `rects`. */
  rect?: Rect

  /**
   * Host-specific extras. Stored and returned verbatim; the platform never
   * reads or interprets them. Use for concepts one host has and another does
   * not — hosting mode, pinned state, per-host view options.
   */
  meta?: Record<string, unknown>
}

/**
 * A group of panels. Hosts that render tabs map one tab to one tab; hosts that
 * render a single surface use exactly one.
 */
export interface Tab {
  id: string
  name: string
  icon?: string
  background?: string
  panels: Panel[]
}

/** How a workspace looks. */
export interface Layout {
  tabs: Tab[]
  activeTabId: string
  geometry: Geometry
}

/** What is loaded: a named, saveable set of apps and their arrangement. */
export interface Workspace {
  id: string
  name: string
  /** Epoch milliseconds of the last successful save. */
  savedAt: number
  layout: Layout
}

/**
 * Enough to render a workspace picker without loading each workspace in full.
 */
export interface WorkspaceSummary {
  id: string
  name: string
  savedAt: number
}
