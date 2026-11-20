# @finos/sail-one

The tab-and-grid Sail shell. Platform-only under `src/` — agent protocol, AppD, and
intent/channel UI live in extensions loaded from `extensions.json` (same pattern as
`@finos/sail-finance`).

`sail-one` and `sail-finance` are sibling shells. Neither imports the other — the
boundary is enforced by `no-restricted-imports` in `.oxlintrc.json`. Anything shared
belongs in `@finos/sail-theme` or the platform. `npm run boundary:fdc3` fails if
`src/` regains agent-protocol references.

```bash
npm run dev -w @finos/sail-one     # http://localhost:8090
npm run dev:one                    # agent + platform watch builds alongside the shell
```

## Shape

`src/state/` holds the seams the UI talks to:

| Module                     | Role                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| `SailOneUserSession`       | Shell session: open/close, panel persistence, host Window associations.         |
| `getSession()`             | The registered `SailUserSession` (a `SailOneUserSession`).                      |
| `getCatalog()`             | `SailPlatformCatalog` — start-menu apps (`list()`).                             |
| `client-state.ts`          | Tab/panel chrome API; owned and persisted by `SailOneUserSession`.              |
| `default-app-state.ts`     | Window helpers and `open()` which queues Frame vs Tab then calls `openApp`.     |
| `extensions-runtime.ts`    | Loads extension cores/UIs; exposes platform session, bus, catalog, and storage. |

State is stored through `createLocalUserStorage({ keyPrefix: "sail_one_" })` from
`@finos/sail-platform`. Because that API is async, `SailOneUserSession.load()` must be
awaited before the first render — see `src/index.tsx`.

## Launch path

1. UI calls `getAppState().open(app, hosting?)`, which queues the hosting choice and
   calls `getSession().openApp(...)` with catalog metadata.
2. `SailOneUserSession.openApp` mounts a panel or popup from the queued choice
   (defaulting to panel / `NEW_WINDOW` location) and persists layout.
3. Close goes through `getSession().closeApp(instanceId)`, which unmounts, updates
   storage, and clears the host Window association.
