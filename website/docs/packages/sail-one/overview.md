---
sidebar_position: 1
---

# @finos/sail-one

`sail-one` is one of Sail's two **example UIs** — the **domain-neutral** one, for more general use. It
is a tab-and-grid canvas shell, ported from `packages/sail-web` on FINOS `wip/v2.2` and rewired onto
the current `@finos/sail-desktop-agent` and `@finos/sail-platform`.

**Location:** `packages/sail-one/`

Its sibling, [`sail-finance`](../sail-finance/overview), is the **finance-specific** example UI. Neither
is "the reference host" — both are starting points to deploy or adapt, split by domain, not by
maturity. `sail-one` and `sail-finance` never import each other — `no-restricted-imports` in
`.oxlintrc.json` enforces this; anything genuinely shared belongs in `@finos/sail-theme` or the
platform.

## Development

```bash
npm run dev -w @finos/sail-one     # http://localhost:8090
npm run dev:one                    # agent + platform watch builds alongside the shell
```

Dev server port from `vite.config.ts:51,62`.

## Construction

`sail-one` composes the two packages itself: it constructs `new SailDesktopAgent({...})` for FDC3 and
uses `@finos/sail-platform`'s storage for its own shell state. `src/state/` holds the three seams the
UI talks to:

| Module | Role |
|---|---|
| `sail-host.ts` | Owns the `SailDesktopAgent` instance and the shell's own `AppLauncher` — the only file that talks to the agent. |
| `client-state.ts` | Shell state (tabs, panels, directories, custom apps), persisted through a `SailStorage`. |
| `default-app-state.ts` | Window/iframe bookkeeping and the user's hosting choice for a launch. |

For how the two packages relate, see
[Architecture Overview — How the packages compose](../../architecture/overview#how-the-packages-compose).

## Persistence: `SailStorage`

State is stored through `createLocalStorage({ keyPrefix: "sail_one_" })` (`client-state.ts`) rather
than raw `localStorage`, so the backing store is swappable — including for a remote one — without
touching the shell. This is the concrete contrast with `sail-finance`, which persists its own way
through Zustand `persist` over raw `localStorage` — see
[@finos/sail-finance](../sail-finance/overview).

Because the storage API is async, `ClientState.load()` **must be awaited before the first render** —
otherwise the Desktop Agent would be constructed with default channels and then immediately restarted
once the persisted set arrives. `src/index.tsx:16` awaits `getClientState().load()` before calling
`createRoot(...).render(...)` (`:18-20`), and only then registers the Desktop Agent (`:23`). This is
the shell's worked example of the lifecycle contract described in
[Architecture Overview — Lifecycle and its one real constraint](../../architecture/overview#lifecycle-and-its-one-real-constraint):
storage is async, but `apps`/`userChannels` are constructor data and `start()` is synchronous, so
persisted state must be read before the agent is constructed, not after.

`sail-one` uses storage directly for its own shell-state shape (tabs, panels, directories, custom
apps); it does not yet drive `createWorkspaceStore`. That is a fact about this point in the shell's
port, not a limitation of the package — see
[@finos/sail-platform](../platform/overview).

## Conversion notes

**App launches are agent-owned.** The old host minted instance ids and told the agent via
`registerPendingLaunch`. Now `agent.apps.open()` calls the shell's own `AppLauncher`, which mints the
id and creates the panel or window. `SailHost` queues the user's hosting choice
(`Frame` vs `Tab`) so the callback knows where to put it; a launch arriving from another app's
`fdc3.open()` has no queued choice and defaults to `Frame`.

**Intent resolution is agent-driven.** The old host's "one app, one intent" short-circuit
(`narrowIntents`) is gone. The agent calls the host's `intentResolver` only when a choice is genuinely
needed.

**`setUserChannel` no-ops for unknown instances.** `changeAppChannel` resolves on the agent's
`channelChanged` push, so calling it for a stale panel id would hang until the channel-change timeout —
`sail-host.ts` guards this by checking `agent.apps.getInstance(instanceId)` first.

## Known gaps `[planned]`

These are deliberate interim behaviours, not oversights. Each disappears when the corresponding agent
API lands.

**Structural channel and directory edits restart the agent `[planned]`.** `userChannels` seeds agent
state once at construction and there is no `ensureUserChannel`; likewise `apps.addDirectory` is additive
with no replace. So adding, removing, or renaming a tab — or deactivating a directory — tears down and
rebuilds the `SailDesktopAgent` instance (`sail-host.ts`'s `restart` method), and connected apps must
re-handshake. Cosmetic tab edits (colour, icon) deliberately do *not* restart, which means the
`displayMetadata` apps see via `getUserChannels()` is stale until the next structural change or reload.

FDC3 2.2 permits the underlying feature: user channels are "created and named by the desktop agent," the
eight standard channels are `SHOULD` not `MUST`, and implementations `MAY` support configuration of the
user channel set (FDC3 2.2 spec, "User Channels"). Runtime mutation is simply unspecified, so the API
shape is Sail's to choose.

**Directory removal is all-or-nothing `[planned]`.** The agent tracks no provenance from app to source
directory, so there is no way to drop just the apps a removed directory contributed. The App Directory
spec defines only `GET /v2/apps` and `GET /v2/apps/{appId}`, with no delete, hidden, or deprecation
semantics — delete-vs-hide is a Sail product decision, not a spec requirement.

**`embeddable-ui/` is carried but not wired `[planned]`.** `src/embeddable-ui/channel-selector.tsx` and
`intent-resolver.tsx` implement the FDC3 injected-UI protocol (`Fdc3UserInterfaceHello` →
`Fdc3UserInterfaceHandshake`, then `Restyle` / `Channels` / `ChannelSelected` / `Resolve` /
`ResolveAction`, via `connectUserInterfacePort` in `iframe-port.ts`). The agent defaults
`getIntentResolverUrl` and `getChannelSelectorUrl` to `() => false`
(`browser-app-connection.ts:84-88`), and neither file is wired into `sail-one`'s Vite build, so
nothing loads them today.

They exist for the case FDC3's browser-resident spec calls out directly: a Desktop Agent may not be able
to present a channel selector in a window opened with `window.open()`. Apps hosted in the shell's own
chrome do not need them; apps popped out into their own window do. Wiring them back requires making
those URLs a host policy rather than a constant.

**`AppInstanceState.NotResponding` is unreachable `[planned]`.** The agent exposes
`"pending" | "connected"` plus a disconnect event; heartbeat health is not surfaced to hosts.
`public/icons/app-state/not-responding.svg` is retained for when it is.

## Related

- [@finos/sail-platform](../platform/overview) — workspaces, layouts, and the storage this shell uses.
- [@finos/sail-desktop-agent](../desktop-agent/overview) — the FDC3 engine this shell constructs.
- [@finos/sail-finance](../sail-finance/overview) — the finance-specific sibling shell.
- [Architecture Overview](../../architecture/overview) — package ownership and how the two compose.
