# @finos/sail-platform

Platform capabilities for Sail hosts: **session**, **bus**, **catalog**, and **storage**,
plus **id constants** for those capabilities and for UI extension points.

No FDC3 protocol types and no React. Hosts pre-register ambient capabilities before loading
extensions, using the constants from `src/ids.ts` (do not hard-code string literals).

## Ids (`src/ids.ts`)

| Constant | Value | Kind |
|---|---|---|
| `SAIL_PLATFORM_SESSION` | `sail.platform.session` | capability |
| `SAIL_PLATFORM_BUS` | `sail.platform.bus` | capability |
| `SAIL_PLATFORM_CATALOG` | `sail.platform.catalog` | capability |
| `SAIL_PLATFORM_STORAGE` | `sail.platform.storage` | capability |
| `SAIL_UI_CONFIG` | `sail.ui.config` | `contributes` (settings panels) |
| `SAIL_UI_HIDDEN` | `sail.ui.hidden` | `contributes` (top-level host iframe, no chrome) |
| `SAIL_UI_APP_BAR` | `sail.ui.app.bar` | `contributes` (per-app panel header chrome) |

### `SailExtensionUIProps.properties` per contribution point

| Contribution point | Constant | `properties` keys |
|---|---|---|
| `sail.ui.config` | `SAIL_UI_CONFIG` | _(none)_ |
| `sail.ui.hidden` | `SAIL_UI_HIDDEN` | _(none)_ |
| `sail.ui.app.bar` | `SAIL_UI_APP_BAR` | `instanceId: string` (required) — FDC3 app instance for this panel |

Use `getAppBarProperties(props.properties)` when mounting or implementing `sail.ui.app.bar` UIs.

Hosts mount `sail.ui.config` in settings UI, `sail.ui.hidden` in a non-visible root of the
**top-level** page (or v2 client), and `sail.ui.app.bar` in each app panel header (with
`properties.instanceId`). Browser-only edges such as WCP live under `sail.ui.hidden`
so extension `activate` stays isomorphic for Node.

## Capabilities

| Capability id | Type | Role |
|---|---|---|
| `sail.platform.session` | `SessionService` | `getSession` / `getSessionByApp` / `getSessions` / `onSession` → `SailUserSession` |
| `sail.platform.bus` | `SailPlatformBus` | `post(msg, sessionId, peer)` / `subscribe`; peer is `AppInstanceId` or `SERVER_INSTANCE` (app → DA). `forSession(session)` → `SailSessionBus`. |
| `sail.platform.catalog` | `SailPlatformCatalog` | Known apps via providers; `list(sessionId)` |
| `sail.platform.storage` | `SailStorage` | Resolve `SailSessionId` → `SailUserStorage` |


## License

Copyright 2026 FINOS. Distributed under the Apache 2.0 License.
