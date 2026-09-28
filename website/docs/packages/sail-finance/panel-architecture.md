---
sidebar_position: 2
title: Panel model and popout relay
---

# Dockview panel model and popout relay

`sail-finance`'s workspace UI is built on [Dockview](https://dockview.dev/) (`dockview` +
`dockview-react`), a docking/tabbing layout library, wired to a family of Zustand stores. This page
describes that wiring in depth; [the package overview](./overview) covers `sail-finance` as a whole.

## Workspace → Tab → Panel model

The canvas is a three-level hierarchy, typed in `src/stores/workspace-store.ts:7-35`:

```text
Workspace  (uuid, name, timeLastSaved, layout)
  └─ Tab   (tabId, name, panels)
       └─ Panel  (panelId, appId, title, url, icon)  — one FDC3 app instance
```

`useWorkspaceStore` (`workspace-store.ts:202-409`) is the single source of truth for this hierarchy —
create/delete workspaces and tabs, add/remove panels, and a `dockviewLayout: unknown` field per
workspace that holds Dockview's own serialized layout state (`Grid.dockviewLayout`,
`workspace-store.ts:26`). The store persists itself via Zustand's `persist` middleware over raw
`localStorage` (`:204,405-407`) with a custom `mapStorage` implementation
(`:112-197`) that hand-serializes the `Map`-based `workspaces`/`tabs`/`panels` structures — `JSON.stringify`
cannot round-trip a `Map` on its own.

## Syncing the store with the Dockview API

`src/components/layout-grid/Layout.tsx` owns a live `DockviewApi` handle (`useRef`, set in `onReady` at
`:55-58`) and keeps it synchronized with `useWorkspaceStore` in both directions:

- **Restore on mount/workspace switch** (`:66-120`): reads the active workspace's
  `dockviewLayout` via `getDockviewLayout` and calls `api.current.fromJSON(...)` to rebuild Dockview's
  panel/group layout from the serialized state, guarded by a ref so it runs once per workspace.
- **Save on change** (`:123-221`): subscribes to `api.onDidAddPanel`, `api.onDidRemovePanel`, and
  `api.onDidLayoutChange` (`:150-209`); each calls a `saveState()` closure that reads
  `api.current.toJSON()` and writes it back via `setDockviewLayout`. Panel removal also disconnects the
  corresponding FDC3 app instance (`agent.apps.disconnect(instanceId)`, `:186`) via the connection store
  below — closing a Dockview panel is what tears down its Desktop Agent connection.
- **Reconcile the panel list** (`:224-299`): a separate effect diffs the store's `panels` array against
  Dockview's own `api.panels` and adds/removes Dockview panels to match — this is what lets the shell's
  `AppLauncher.launch` (which only touches the workspace store, see
  [package overview — construction and state](./overview#construction-and-state))
  cause a new Dockview panel to appear without calling the Dockview API directly.

## The popout relay shell

Dockview panel groups can be torn off into their own OS-level browser window — this is a **native
`dockview-react` feature** (`containerApi.addPopoutGroup(group, { popoutUrl })`,
`RightControls.tsx:30-31`; also passed as the `popoutUrl` prop to `<DockviewReact>` for drag-to-popout,
`Layout.tsx:318`), not something `sail-finance` builds itself. Both call sites use
`dockviewPopoutUrl()` (`src/utils/dockview-popout.ts:3-7`), which returns the current page URL with a
`?popout=1` query parameter — Dockview opens that URL in a `window.open()`'d window and renders the torn-off
group's panels inside it.

That creates a real problem for FDC3: `BrowserAppConnection` listens for `WCP1Hello` `postMessage`s in
**one** browser tab — the main window where `SailDesktopAgent` was constructed (see
[Architecture Overview — one Desktop Agent per browsing context](../../architecture/overview#5-one-desktop-agent-per-browsing-context-implemented)).
An FDC3 app iframe that ends up inside the popout window would send its `WCP1Hello` to that window's
`postMessage` target, which the agent is not listening on.

`bootstrapDockviewPopoutShell()` (`dockview-popout.ts:33-59`) is the relay that closes this gap. `main.tsx`
checks `isDockviewPopoutShell()` (the `?popout=1` marker, `dockview-popout.ts:9-11`) at startup and, if
true, runs the popout shell instead of the normal app bootstrap. The popout shell:

1. **Mirrors the opener's theme** (`syncThemeFromOpener`, `:13-19`) by copying `window.opener`'s root
   `<html>` class onto its own, and keeps watching for changes via a `MutationObserver` (`:38-39`) — so
   dark/light mode stays in sync with the main window.
2. **Relays `WCP1Hello`** (`:42-58`): listens for `message` events, ignores anything not shaped like a
   `WCP1Hello` (`isWcpHello`, `:21-27`), and — for genuine hellos from a child iframe inside the popout
   window — forwards the message (and its `MessagePort`s, `:56`) on to `window.opener`. Because
   `BrowserAppConnection` in the main window is listening there, the WCP handshake completes exactly as
   it would for an iframe hosted directly in the main window; the app never needs to know its iframe
   ended up in a second OS window.

The result: the single-agent invariant holds even when a user tears a panel out into its own window —
there is still exactly one `SailDesktopAgent`, exactly one `BrowserAppConnection`, and the popout window
contributes no FDC3 state of its own. It is a message relay, not a second agent.

## The wider Zustand store family

`src/stores/` holds six store modules. Not all of them are wired into the running app:

| Store | Wired into components? | Role |
|---|---|---|
| `workspace-store.ts` | Yes | Workspace/tab/panel hierarchy and Dockview layout persistence (above). |
| `connection-store.ts` | Yes (`createConnectionStore(agent)`, consumed via `SailDesktopAgentContext`) | Mirrors the agent's `apps`/`channels` controller events into a `Map<instanceId, Connection>`, and links FDC3 app instances to Dockview panel ids — including a cross-origin-iframe fallback path (`findWaitingPanelForSource`, `:57-71`) for connections that arrive before their panel is registered, since `hostIdentifier` cannot always be read across origins. |
| `app-directory-store.ts` | Yes (`createAppDirectoryStore(agent)`, via context) | Mirrors `agent.apps.getAll()` / `agent.apps.addDirectory()` for the app-directory UI. |
| `intent-resolver-store.ts` | Yes (`IntentResolverDialog.tsx`, via context) | Mirrors `agent.intentResolver` pending requests for the intent-picker dialog. |
| `ui-store.ts` | Yes (several components) | Small, agent-independent UI toggle: which quick-access panel (app directory vs workspace directory) is open. |
| `fdc3-store.ts` | **No** — referenced only by its own unit test (`__tests__/stores/fdc3-store.test.ts`) | A `Map<panelId, Window>` registry. Not constructed or read from any component today. |

`fdc3-store.ts` is real, tested code — it is just not part of the live component tree as it exists
today. Treat any doc or code sample built around it as unverified against the running app until
something actually consumes `createFDC3Store` outside a test file.

A seventh module, `panel-store.ts`, was **removed**: it defined a flatter `Panel[]`/`activeTabId`
model duplicating `workspace-store.ts`'s nested one, and nothing outside its own test and an unused
`stores/index.ts` barrel referenced it.

## Related

- [@finos/sail-finance overview](./overview) — the package this page details.
- [Architecture Overview — one Desktop Agent per browsing context](../../architecture/overview#5-one-desktop-agent-per-browsing-context-implemented) — the invariant the popout relay preserves.
- [Channel selection](../../architecture/channel-selection) — how `connection-store.ts` and `ChannelSelector.tsx` fit the host-chrome channel model.
