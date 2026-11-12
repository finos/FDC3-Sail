import { describe, test, expect } from "vite-plus/test"
import { normalizeDockviewLayout } from "../../components/layout-grid/normalize-layout"

interface Node {
  type: "leaf" | "branch"
  data: unknown
  size?: number
  visible?: boolean
}

function leaf(id: string, size?: number, visible?: boolean): Node {
  return {
    type: "leaf",
    data: { views: [id], activeView: id, id: `group-${id}` },
    ...(size === undefined ? {} : { size }),
    ...(visible === undefined ? {} : { visible }),
  }
}

function branch(children: Node[], size?: number): Node {
  return { type: "branch", data: children, ...(size === undefined ? {} : { size }) }
}

function layout(root: Node, orientation = "HORIZONTAL") {
  return {
    grid: { root, width: 1000, height: 600, orientation },
    panels: {},
    activeGroup: "group-A",
  }
}

/** The grid of a normalized layout, typed for assertions. */
function grid(normalized: unknown) {
  return (normalized as { grid: { root: Node; orientation: string } }).grid
}

function children(node: Node): Node[] {
  return node.data as Node[]
}

describe("normalizeDockviewLayout", () => {
  test("returns the identical object for a layout that needs no change", () => {
    const clean = layout(branch([leaf("A", 400), branch([leaf("B"), leaf("C")], 600)]))

    expect(normalizeDockviewLayout(clean)).toBe(clean)
  })

  test("returns the identical object for a single-leaf root, as Dockview serializes one panel", () => {
    const single = layout(branch([leaf("A", 600)]))

    expect(normalizeDockviewLayout(single)).toBe(single)
  })

  test("drops an emptied branch and leaves the orientation alone", () => {
    const normalized = normalizeDockviewLayout(
      layout(branch([leaf("A", 300), leaf("B", 300), branch([], 400)])),
    )

    expect(grid(normalized).orientation).toBe("HORIZONTAL")
    expect(children(grid(normalized).root).map(node => node.type)).toEqual(["leaf", "leaf"])
  })

  test("replaces a single-leaf branch with the leaf, carrying the branch's size", () => {
    const normalized = normalizeDockviewLayout(
      layout(branch([branch([leaf("A", 600)], 400), branch([leaf("B"), leaf("C")], 600)])),
    )

    const [first, second] = children(grid(normalized).root)

    // 400 is the branch's width along the root's axis; the leaf's own 600 measured the branch's
    // cross axis and means nothing in the slot the branch vacated.
    expect(first).toMatchObject({ type: "leaf", size: 400 })
    expect(second?.type).toBe("branch")
  })

  test("keeps a hidden leaf's own size, which Dockview restores as its cachedVisibleSize", () => {
    const normalized = normalizeDockviewLayout(
      layout(branch([branch([leaf("A", 250, false)], 400), branch([leaf("B"), leaf("C")], 600)])),
    )

    expect(children(grid(normalized).root)[0]).toMatchObject({
      type: "leaf",
      size: 250,
      visible: false,
    })
  })

  test("flips the root when an emptied branch leaves a single branch behind", () => {
    const normalized = normalizeDockviewLayout(
      layout(branch([branch([], 400), branch([leaf("B", 300), leaf("C", 300)], 600)])),
    )

    expect(grid(normalized).orientation).toBe("VERTICAL")
    // A node's size spans its parent's axis: the flipped root now runs vertically, so its own
    // extent is the grid width.
    expect(grid(normalized).root.size).toBe(1000)
    expect(children(grid(normalized).root).map(node => node.type)).toEqual(["leaf", "leaf"])
  })

  test("flips a VERTICAL root to HORIZONTAL and sizes it by the grid height", () => {
    const normalized = normalizeDockviewLayout(
      layout(branch([branch([], 400), branch([leaf("B"), leaf("C")], 600)]), "VERTICAL"),
    )

    expect(grid(normalized).orientation).toBe("HORIZONTAL")
    expect(grid(normalized).root.size).toBe(600)
  })

  test("lifts the grandchildren of a single-branch branch, keeping the axis", () => {
    // root(HORIZONTAL) -> [leaf(A), branch(VERTICAL)[branch(HORIZONTAL)[leaf(B), leaf(C)]]].
    // Orientations alternate, so B and C already run horizontally: A | B | C.
    const normalized = normalizeDockviewLayout(
      layout(branch([leaf("A", 200), branch([branch([leaf("B"), leaf("C")], 600)], 800)])),
    )

    expect(grid(normalized).orientation).toBe("HORIZONTAL")
    expect(children(grid(normalized).root).map(node => node.type)).toEqual(["leaf", "leaf", "leaf"])
  })

  test("returns null for a layout that holds no leaves", () => {
    expect(normalizeDockviewLayout(layout(branch([branch([]), branch([branch([])])])))).toBeNull()
  })

  test("passes non-layout values through unchanged", () => {
    expect(normalizeDockviewLayout(null)).toBeNull()
    expect(normalizeDockviewLayout(undefined)).toBeUndefined()

    const empty = {}
    expect(normalizeDockviewLayout(empty)).toBe(empty)

    const noGrid = { panels: {} }
    expect(normalizeDockviewLayout(noGrid)).toBe(noGrid)

    const gridWithoutRoot = { grid: { width: 100, height: 100, orientation: "HORIZONTAL" } }
    expect(normalizeDockviewLayout(gridWithoutRoot)).toBe(gridWithoutRoot)
  })

  test("leaves the panels and activeGroup of a rewritten layout intact", () => {
    const source = layout(branch([leaf("A", 300), branch([], 400)]))
    source.panels = { A: { id: "A" } }

    const normalized = normalizeDockviewLayout(source) as typeof source

    expect(normalized).not.toBe(source)
    expect(normalized.panels).toBe(source.panels)
    expect(normalized.activeGroup).toBe("group-A")
    expect(grid(normalized).root).not.toBe(source.grid.root)
  })
})
