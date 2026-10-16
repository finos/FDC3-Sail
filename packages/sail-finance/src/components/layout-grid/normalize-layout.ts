/**
 * Dockview serialized-layout normalization.
 *
 * Dockview collapses a branch that is left with a single child (`Gridview.normalize`), but not one
 * left with none. An empty branch keeps its share of the grid, so the workspace shows a blank
 * column (or row) and — because the emptied layout is what gets saved — the gap survives reloads.
 *
 * A branch can only reach zero children if it held exactly one leaf, which Dockview's own
 * drag/split UI never builds. So this only shows up for layouts written outside Dockview:
 * pre-seeded, imported or hand-written `dockviewLayout` state.
 *
 * Normalizing the serialized grid on the way into `fromJSON` drops those branches. Layouts that
 * need no change are returned by reference, so restore behaves exactly as it does today for grids
 * Dockview built itself.
 */

/** Dockview's `Orientation` is a string enum, so the serialized grid carries these verbatim. */
const HORIZONTAL = "HORIZONTAL"
const VERTICAL = "VERTICAL"

interface SerializedNode {
  type: "leaf" | "branch"
  data: unknown
  size?: number
  visible?: boolean
}

interface SerializedGrid {
  root: SerializedNode
  width: number
  height: number
  orientation: string
}

interface SerializedLayout {
  grid: SerializedGrid
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSerializedNode(value: unknown): value is SerializedNode {
  if (!isRecord(value)) {
    return false
  }
  return (value.type === "leaf" || value.type === "branch") && "data" in value
}

function isBranch(node: SerializedNode): node is SerializedNode & { data: unknown[] } {
  return node.type === "branch" && Array.isArray(node.data)
}

function childrenOf(node: SerializedNode & { data: unknown[] }): SerializedNode[] {
  return node.data.filter(isSerializedNode)
}

function isSerializedLayout(value: unknown): value is SerializedLayout {
  if (!isRecord(value) || !isRecord(value.grid)) {
    return false
  }
  return isSerializedNode(value.grid.root)
}

interface NormalizedChildren {
  children: SerializedNode[]
  changed: boolean
}

/**
 * Normalize a branch's children: drop the ones left without leaves, and lift the grandchildren of a
 * child that is itself a one-branch branch. Orientations alternate down the tree, so those
 * grandchildren already lie along this branch's axis.
 */
function normalizeChildren(node: SerializedNode & { data: unknown[] }): NormalizedChildren {
  const children = childrenOf(node)
  const normalized: SerializedNode[] = []
  let changed = children.length !== node.data.length

  children.forEach(child => {
    const next = normalizeNode(child)

    if (next === null) {
      changed = true
      return
    }
    if (next !== child) {
      changed = true
    }

    if (isBranch(next)) {
      const grandchildren = childrenOf(next)
      const only = grandchildren.length === 1 ? grandchildren[0]! : undefined
      if (only && isBranch(only)) {
        normalized.push(...childrenOf(only))
        changed = true
        return
      }
    }

    normalized.push(next)
  })

  return { children: normalized, changed }
}

/**
 * Normalize one non-root node.
 *
 * Returns `null` when the node holds no leaves and its parent should drop it, or the same reference
 * when nothing below it changed.
 */
function normalizeNode(node: SerializedNode): SerializedNode | null {
  if (!isBranch(node)) {
    return node
  }

  const { children, changed } = normalizeChildren(node)

  if (children.length === 0) {
    return null
  }

  // A branch holding a single leaf is redundant: the leaf takes the branch's place, and with it the
  // branch's size — the leaf's own size measures the branch's cross axis and means nothing in the
  // slot the branch vacated. A hidden leaf keeps its own size, which Dockview restores as its
  // `cachedVisibleSize`.
  const only = children.length === 1 ? children[0]! : undefined
  if (only && !isBranch(only)) {
    if (only.visible === false || only.size === node.size) {
      return only
    }
    return { ...only, size: node.size }
  }

  return changed ? { ...node, data: children } : node
}

/**
 * Drop branches that hold no leaves from a serialized Dockview layout.
 *
 * Returns the same reference when the layout needs no change, `null` when it holds no leaves at
 * all, and non-layout values (`null`, `{}`, anything not shaped like a serialized grid) unchanged.
 */
export function normalizeDockviewLayout(layout: unknown): unknown {
  if (!isSerializedLayout(layout)) {
    return layout
  }

  const { grid } = layout
  const root = grid.root

  // Dockview's root is always a branch; a leaf root is not something `fromJSON` accepts, so there
  // is nothing to normalize and nothing worth rewriting.
  if (!isBranch(root)) {
    return layout
  }

  const { children, changed } = normalizeChildren(root)

  if (children.length === 0) {
    return null
  }

  if (!changed) {
    return layout
  }

  // The root cannot be left holding a single branch: that branch's children run along the root's
  // own axis, so lifting them into the root means the grid now splits the other way. A single leaf
  // is fine — that is how Dockview serializes a one-panel workspace.
  const only = children.length === 1 ? children[0]! : undefined
  if (only && isBranch(only)) {
    const orientation = grid.orientation === VERTICAL ? HORIZONTAL : VERTICAL
    return {
      ...layout,
      grid: {
        ...grid,
        orientation,
        root: {
          ...root,
          // A node's size spans its parent's axis, which is the cross axis of its own orientation.
          size: orientation === HORIZONTAL ? grid.height : grid.width,
          data: childrenOf(only),
        },
      },
    }
  }

  return { ...layout, grid: { ...grid, root: { ...root, data: children } } }
}
