# @finos/sail-platform

Workspaces, layouts and storage for FDC3 Sail hosts.

The package answers two questions for a host application, and nothing else:

- **Workspace** — *what is loaded*: a named, saveable set of running apps.
- **Layout** — *how it looks*: how those apps are grouped and arranged.

It is UI-agnostic and FDC3-agnostic, with **no dependencies**. A host that renders one container
with every app inside it, and a host that renders tabbed frames driven by a layout library,
describe themselves with the same types.

FDC3 itself lives in [`@finos/sail-desktop-agent`](../sail-desktop-agent/README.md). Import that
package directly — nothing is re-exported from it here.

## Install

```bash
npm install @finos/sail-platform
```

## Quick start

```typescript
import { createWorkspaceStore } from "@finos/sail-platform"

// Defaults to localStorage under the "sail_" prefix.
const store = createWorkspaceStore()

const workspace = store.create("Trading")
const tabId = workspace.layout.activeTabId

store.addPanel(tabId, {
  appId: "chart",
  title: "Chart",
  url: "https://example.test/chart",
})

await store.save()
```

Bind any UI to it. `subscribe` and `getSnapshot` are shaped for React's `useSyncExternalStore`,
but nothing here is React-specific:

```typescript
const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
```

## Layout geometry: two lanes

A layout stores its arrangement one of two ways, and the type makes them mutually exclusive — two
sources of truth for the same arrangement is how saved layouts silently diverge between hosts.

| Lane | For | Where the arrangement lives |
|------|-----|-----------------------------|
| `{ mode: "renderer", state }` | Hosts using a layout library (Dockview, golden-layout) | `state`, opaque to the platform |
| `{ mode: "rects" }` | Hosts with no layout library | `panel.rect` on each panel |

```typescript
// A host driven by a layout library
store.setRendererState(dockviewApi.toJSON())

// A host placing panels itself
store.setPanelRect(panelId, { x: 0, y: 0, width: 4, height: 3 })
```

Calling `setPanelRect` on a layout a renderer owns throws, rather than quietly recording a
coordinate nothing will read.

Each `Panel` also carries an optional `meta` bag, stored and returned verbatim. Use it for
concepts one host has and another does not — hosting mode, pinned state, per-host view options.

## Storage

Persistence is a four-method port. The default is browser `localStorage`; supply your own object
to push state to a remote service.

```typescript
import { createLocalStorage, createMemoryStorage, type SailStorage } from "@finos/sail-platform"

// Default backing store, with a custom key namespace
createWorkspaceStore({ storage: createLocalStorage({ keyPrefix: "sail_one_" }) })

// Tests and non-browser hosts
createWorkspaceStore({ storage: createMemoryStorage() })

// Remote
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

`list` is what lets a host render a workspace picker without loading every workspace in full.

## Documentation

| Topic | Link |
|-------|------|
| Package overview | [finos.github.io/FDC3-Sail/docs/packages/platform/overview](https://finos.github.io/FDC3-Sail/docs/packages/platform/overview) |
| Desktop Agent integrator guide | [finos.github.io/FDC3-Sail/docs/packages/desktop-agent/integrator-guide](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/integrator-guide) |

## License

Copyright 2025 FINOS. Distributed under the Apache 2.0 License.
