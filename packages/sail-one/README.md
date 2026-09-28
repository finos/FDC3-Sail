# @finos/sail-one

The tab-and-grid Sail shell, ported from `packages/sail-web` on FINOS `wip/v2.2` and
rewired onto the current `@finos/sail-desktop-agent` and `@finos/sail-platform`.

`sail-one` and `sail-finance` are sibling shells. Neither imports the other — the
boundary is enforced by `no-restricted-imports` in `.oxlintrc.json`. Anything shared
belongs in `@finos/sail-theme` or the platform.

```bash
npm run dev -w @finos/sail-one     # http://localhost:8090
npm run dev:one                    # agent + platform watch builds alongside the shell
```

## Shape

`src/state/` holds the three seams the UI talks to:

| Module                | Role                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `sail-host.ts`        | Owns the `SailDesktopAgent` instance and the shell's `AppLauncher`; the only file that talks to the agent. |
| `client-state.ts`     | Shell state (tabs, panels, directories, custom apps), persisted through a `SailStorage`. |
| `default-app-state.ts`| Window/iframe bookkeeping and the user's hosting choice for a launch.     |

State is stored through `createLocalStorage({ keyPrefix: "sail_one_" })` from
`@finos/sail-platform` rather than raw `localStorage`, so the backing store is swappable —
including for a remote one — without touching the shell. Because that API is async,
`ClientState.load()` must be awaited before the first render — see `src/index.tsx`.

## Conversion notes

**App launches are agent-owned.** The old host minted instance ids and told the agent
via `registerPendingLaunch`. Now `apps.open()` calls the shell's own `AppLauncher`, which
mints the id and creates the panel or window. `SailHost` queues the
user's hosting choice (`Frame` vs `Tab`) so the callback knows where to put it; a launch
arriving from another app's `fdc3.open()` has no queued choice and defaults to `Frame`.

**Intent resolution is agent-driven.** `narrowIntents` is gone. The agent calls the host
resolver only when a choice is genuinely needed, so the shell's old "one app, one intent"
short-circuit was dropped rather than reimplemented.

**`setUserChannel` no-ops for unknown instances.** `changeAppChannel` resolves on the
agent's `channelChanged` push, so calling it for a stale panel id would hang until the
channel-change timeout.

## Known gaps

These are deliberate interim behaviours, not oversights. Each disappears when the
corresponding agent API lands.

**Structural channel and directory edits restart the agent.** `userChannels` seeds agent
state once at construction and there is no `ensureUserChannel`; likewise `apps.addDirectory`
is additive with no replace. So adding, removing, or renaming a tab — or deactivating a
directory — tears down and rebuilds the agent, and connected apps must re-handshake.
Cosmetic tab edits (colour, icon) deliberately do *not* restart, which means the
`displayMetadata` apps see via `getUserChannels()` is stale until the next structural
change or reload.

FDC3 2.2 permits the underlying feature: user channels are "created and named by the
desktop agent", the eight standard channels are `SHOULD` not `MUST`, and implementations
`MAY` support configuration of the user channel set (`api/spec.md`, "User Channels").
Runtime mutation is simply unspecified, so the API shape is ours to choose.

**Directory removal is all-or-nothing.** The agent tracks no provenance from app to
source directory, so there is no way to drop just the apps a removed directory
contributed. The App Directory spec is silent here — it defines only `GET /v2/apps`
and `GET /v2/apps/{appId}`, with no delete, hidden, or deprecation semantics — so
delete-vs-hide is a Sail product decision.

**`embeddable-ui/` is carried but not wired.** `html/ui/channel-selector.html` and
`intent-resolver.html` implement the FDC3 injected-UI protocol
(`Fdc3UserInterfaceHello` → `Fdc3UserInterfaceHandshake`, then `Restyle` / `Channels` /
`ChannelSelected` / `Resolve` / `ResolveAction`). The agent defaults
`getIntentResolverUrl` and `getChannelSelectorUrl` to `() => false`, so nothing
loads them today.

They exist for the case the spec calls out directly: "a DA may not have the ability to
present a channel selector in a window that has been opened with `window.open()`"
(`api/specs/browserResidentDesktopAgents.md`). Apps hosted in the shell's own chrome do
not need them; apps popped out into their own window do. Wiring them back requires
making those URLs a host policy rather than a constant.

**`AppInstanceState.NotResponding` is unreachable.** The agent exposes
`"pending" | "connected"` plus a disconnect event; heartbeat health is not surfaced to
hosts. `public/icons/app-state/not-responding.svg` is retained for when it is.
