---
sidebar_position: 1
---

# @finos/sail-platform

`@finos/sail-platform` answers two questions for a host application, and nothing else:

- **Workspace** — *what is loaded*: a named, saveable set of running apps.
- **Layout** — *how it looks*: how those apps are grouped and arranged.

It is UI-agnostic and FDC3-agnostic, with **no dependencies**. A host that renders one container
with every app inside it, and a host that renders tabbed frames driven by a layout library,
describe themselves with the same types.

**Location:** `packages/sail-platform/`

## Scope boundary

The package holds no FDC3. Intents, contexts, channels, app directories, and the DACP/WCP wire
protocols all live in [`@finos/sail-desktop-agent`](../desktop-agent/overview) — **import that
package directly**. Nothing is re-exported from it here, deliberately: a host that can see FDC3
types through `sail-platform` cannot tell which package owns what.

It also holds no UI. `Tab.icon` and `Tab.background` are stored, never interpreted; `Panel.meta` is
returned verbatim. The package describes a host's state — it never renders it.

## Workspaces and layouts

```typescript
interface Workspace {
  id: string
  name: string
  savedAt: number // epoch ms of the last successful save; 0 when never saved
  layout: Layout
}

interface Layout {
  tabs: Tab[]
  activeTabId: string
  geometry: Geometry
}

interface Tab {
  id: string
  name: string
  icon?: string
  background?: string
  panels: Panel[]
}

interface Panel {
  id: string
  appId: string
  title: string
  url: string
  icon?: string
  rect?: Rect // set only in the "rects" geometry lane
  meta?: Record<string, unknown> // host extras, stored verbatim
}
```

A host that renders a single surface uses exactly one `Tab`. A host that renders tabs maps one
`Tab` to one tab. Neither has to know about the other's model.

`Panel.meta` is where a concept one host has and another does not lives — hosting mode, pinned
state, per-host view options. The platform stores and returns it without reading it.

## Layout geometry: two lanes

A layout stores its arrangement one of two ways, and the type makes them mutually exclusive. Two
sources of truth for the same arrangement is how saved layouts silently diverge between hosts.

```typescript
type Geometry = { mode: "renderer"; state: unknown } | { mode: "rects" }
```

| Lane | For | Where the arrangement lives |
|---|---|---|
| `{ mode: "renderer", state }` | Hosts using a layout library (Dockview, golden-layout) | `state`, opaque to the platform |
| `{ mode: "rects" }` | Hosts placing panels themselves | `panel.rect` on each panel |

```typescript
// A host driven by a layout library
store.setRendererState(dockviewApi.toJSON())

// A host placing panels itself
store.setPanelRect(panelId, { x: 0, y: 0, width: 4, height: 3 })
```

`setRendererState` switches the layout into the renderer lane, so a host never has to reason about
the union directly. Calling `setPanelRect` on a layout a renderer owns **throws**, rather than
quietly recording a coordinate nothing will read.

`create()` defaults to `{ mode: "rects" }`; pass `geometry` to start in the renderer lane.

## The store

```typescript
import { createWorkspaceStore } from "@finos/sail-platform"

const store = createWorkspaceStore() // localStorage under the "sail_" prefix

const workspace = store.create("Trading")
store.addPanel(workspace.layout.activeTabId, {
  appId: "chart",
  title: "Chart",
  url: "https://example.test/chart",
})

await store.save()
```

Mutations are **synchronous and in-memory**; persistence is **explicit** via `save()`. A host is
free to render every keystroke and save on a debounce.

| Group | Methods |
|---|---|
| Reading | `getSnapshot()`, `subscribe(listener)` |
| Workspace lifecycle | `create(name, options?)`, `rename(name)`, `refresh()`, `load(id)`, `save()`, `remove(id)` |
| Tabs | `addTab(name, options?)`, `removeTab(id)`, `renameTab(id, name)`, `activateTab(id)` |
| Panels | `addPanel(tabId, panel)`, `removePanel(id)`, `movePanel(id, toTabId)` |
| Geometry | `setRendererState(state)`, `setPanelRect(panelId, rect)` |

`getSnapshot()` returns `{ workspace, saved }` — the active workspace (or `null`), and summaries of
everything in storage as of the last `refresh()`, newest save first. The snapshot object is replaced
wholesale on every mutation and stable between them, which is exactly React's
`useSyncExternalStore` contract:

```typescript
const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
```

Nothing about this is React-specific — `subscribe`/`getSnapshot` is a plain observable pair any UI
can bind to.

**Errors are loud, not silent.** Mutating before `create()` or `load()` throws
`"No workspace loaded"`; an unknown tab or panel id throws rather than no-opping. A host that
addresses something that isn't there has a bug, and the store says so.

### Determinism for tests

`createId` and `now` are injectable, so a test can assert on ids and timestamps without mocking
globals:

```typescript
let id = 0
const store = createWorkspaceStore({
  storage: createMemoryStorage(),
  createId: () => `id-${++id}`,
  now: () => 1_000,
})
```

## Storage

Persistence is a four-method port. The default is browser `localStorage`; supply your own object to
push state to a remote service.

```typescript
interface SailStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  list(prefix?: string): Promise<string[]>
}
```

`list` is what lets a host render a workspace picker without loading every workspace in full.

```typescript
import { createLocalStorage, createMemoryStorage, type SailStorage } from "@finos/sail-platform"

// Default backing store, with a custom key namespace
createWorkspaceStore({ storage: createLocalStorage({ keyPrefix: "sail_one_" }) })

// Tests and non-browser hosts
createWorkspaceStore({ storage: createMemoryStorage() })

// Remote — any object satisfying the port
const remote: SailStorage = {
  get: async key => (await fetch(`/api/state/${key}`)).json(),
  set: async (key, value) => {
    await fetch(`/api/state/${key}`, { method: "PUT", body: JSON.stringify(value) })
  },
  remove: async key => {
    await fetch(`/api/state/${key}`, { method: "DELETE" })
  },
  list: async prefix => (await fetch(`/api/state?prefix=${prefix ?? ""}`)).json(),
}

createWorkspaceStore({ storage: remote })
```

The port is `async` over a synchronous `localStorage` on purpose — a remote backend is a swap, not a
rewrite.

Two properties worth knowing:

- **Reads never throw.** A corrupt or unreadable entry resolves to `null`, so one bad value cannot
  stop a host from booting.
- **`refresh()` reads every saved workspace** to build its summaries, in parallel. There is no index
  key to drift out of sync with reality. A remote `SailStorage` that finds this expensive can cache
  inside its own `list`/`get`.

Storage is usable on its own, without the workspace store — `sail-one` persists its shell state
through `createLocalStorage` directly.

## Implemented vs planned

**`[implemented]`** — the workspace and layout types; both geometry lanes; the workspace store with
save/load/list/remove; the `SailStorage` port with `localStorage` and in-memory adapters; injectable
id and clock.

**`[planned]`** — nothing in this package. Auth, entitlements, and backend connectors do not exist
in any form.

## Reference implementations

Two shells in this repo are worked examples, not the reason this package's API exists. An API here
is not downgraded because no shell drives it, and a shell using the package a particular way is not
the package's contract.

- **`sail-one`** (domain-neutral example UI) — persists its shell state through `createLocalStorage`
  (`packages/sail-one/src/state/client-state.ts`). See [@finos/sail-one](../sail-one/overview).
- **`sail-finance`** (finance-specific example UI) — renders tabbed Dockview frames and holds an
  equivalent workspace model in its own Zustand store
  (`packages/sail-finance/src/stores/workspace-store.ts`). See
  [@finos/sail-finance](../sail-finance/overview).

Neither shell drives `createWorkspaceStore` yet. That is a fact about the shells at this point in
their port, not a limitation of the package.

## Related

- [@finos/sail-desktop-agent](../desktop-agent/overview) — the FDC3 engine. A host imports it
  directly; this package does not wrap it.
- [Desktop Agent integrator guide](../desktop-agent/integrator-guide) — building a host on the agent.
- [Architecture Overview](../../architecture/overview) — package ownership and boundaries.
- [@finos/sail-finance](../sail-finance/overview) · [@finos/sail-one](../sail-one/overview) — the two
  example UIs.
