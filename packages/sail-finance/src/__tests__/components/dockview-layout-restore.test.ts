/**
 * End-to-end cover for #388 against a real Dockview grid: a saved layout whose branch was left
 * without children restores as a blank column, and the normalized layout fills the width.
 *
 * Runs `dockview-core` headlessly in jsdom, which needs a `ResizeObserver` — the grid only uses it
 * to react to container resizes, and these tests size the grid explicitly through `layout()`.
 */

import { describe, test, expect, beforeAll } from "vite-plus/test"
import { DockviewComponent } from "dockview-core"
import { normalizeDockviewLayout } from "../../components/layout-grid/normalize-layout"

const GRID_WIDTH = 1000
const GRID_HEIGHT = 600

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = StubResizeObserver
  }
})

function createDockview(): DockviewComponent {
  const parent = document.createElement("div")
  document.body.appendChild(parent)

  const dockview = new DockviewComponent(parent, {
    createComponent: () => ({
      element: document.createElement("div"),
      init: () => undefined,
      dispose: () => undefined,
    }),
  })
  dockview.layout(GRID_WIDTH, GRID_HEIGHT)

  return dockview
}

function restore(layout: unknown): DockviewComponent {
  const dockview = createDockview()
  dockview.fromJSON(layout as Parameters<DockviewComponent["fromJSON"]>[0])
  dockview.layout(GRID_WIDTH, GRID_HEIGHT)
  return dockview
}

function widths(dockview: DockviewComponent): Record<string, number> {
  return Object.fromEntries(dockview.groups.map(group => [group.id, group.api.width]))
}

const leaf = (id: string, view: string, size: number) => ({
  type: "leaf" as const,
  data: { views: [view], activeView: view, id },
  size,
})

/**
 * A hand-written layout of the kind a default-workspace hook would seed: A alone on the left in a
 * branch of its own, B and C stacked on the right. Dockview's drag/split UI never builds the
 * single-leaf branch around A.
 */
function seededLayout() {
  return {
    grid: {
      root: {
        type: "branch" as const,
        data: [
          { type: "branch" as const, data: [leaf("g1", "A", GRID_HEIGHT)], size: 400 },
          {
            type: "branch" as const,
            data: [leaf("g2", "B", 300), leaf("g3", "C", 300)],
            size: 600,
          },
        ],
      },
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      orientation: "HORIZONTAL",
    },
    panels: {
      A: { id: "A", contentComponent: "default", title: "A" },
      B: { id: "B", contentComponent: "default", title: "B" },
      C: { id: "C", contentComponent: "default", title: "C" },
    },
  }
}

/** The state the workspace store would persist after the user closes panel A. */
function layoutAfterClosingA() {
  const dockview = restore(seededLayout())

  expect(widths(dockview)).toEqual({ g1: 400, g2: 600, g3: 600 })

  dockview.removePanel(dockview.panels.find(panel => panel.id === "A")!)
  dockview.layout(GRID_WIDTH, GRID_HEIGHT)

  return dockview.toJSON()
}

describe("Dockview layout restore (#388)", () => {
  test("closing the single-panel column leaves a branch without children", () => {
    const saved = layoutAfterClosingA()
    const [first] = saved.grid.root.data as { type: string; data: unknown[]; size?: number }[]

    // Dockview collapses a branch left with one child, but not one left with none.
    expect(first).toMatchObject({ type: "branch", data: [], size: 400 })
  })

  test("restoring the saved layout as-is leaves the closed column blank", () => {
    const saved = layoutAfterClosingA()

    // B and C are stacked, so each spans its column: 600 of 1000, leaving a 400px gap.
    expect(widths(restore(saved))).toEqual({ g2: 600, g3: 600 })
  })

  test("restoring the normalized layout fills the width", () => {
    const saved = layoutAfterClosingA()

    expect(widths(restore(normalizeDockviewLayout(saved)))).toEqual({
      g2: GRID_WIDTH,
      g3: GRID_WIDTH,
    })
  })

  test("normalizing the seeded layout up front means closing A never leaves a gap", () => {
    // Normalized at restore, A is a plain leaf at the root, so closing it leaves the root holding
    // a single branch — which Dockview collapses itself. No empty branch is ever created, so the
    // gap never appears in the live session and nothing wrong is persisted.
    const dockview = restore(normalizeDockviewLayout(seededLayout()))

    expect(widths(dockview)).toEqual({ g1: 400, g2: 600, g3: 600 })

    dockview.removePanel(dockview.panels.find(panel => panel.id === "A")!)
    dockview.layout(GRID_WIDTH, GRID_HEIGHT)

    expect(widths(dockview)).toEqual({ g2: GRID_WIDTH, g3: GRID_WIDTH })
    expect(JSON.stringify(dockview.toJSON().grid)).not.toContain('"data":[]')
  })

  test("leaves a layout Dockview built itself untouched", () => {
    const dockview = createDockview()
    dockview.addPanel({ id: "A", component: "default" })
    dockview.addPanel({ id: "B", component: "default", position: { direction: "right" } })
    dockview.addPanel({ id: "C", component: "default", position: { direction: "below" } })
    dockview.layout(GRID_WIDTH, GRID_HEIGHT)

    const saved = dockview.toJSON()

    expect(normalizeDockviewLayout(saved)).toBe(saved)
  })

  test("collapsing a redundant single-leaf branch leaves the grid looking the same", () => {
    const saved = restore(seededLayout()).toJSON()

    // The seeded branch around A is redundant rather than empty, so normalizing rewrites it...
    expect(normalizeDockviewLayout(saved)).not.toBe(saved)
    // ...but A keeps the branch's 400 and nothing moves.
    expect(widths(restore(normalizeDockviewLayout(saved)))).toEqual({ g1: 400, g2: 600, g3: 600 })
  })
})
