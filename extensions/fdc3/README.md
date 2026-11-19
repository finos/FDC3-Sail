# @finos/sail-extension-fdc3

Sail extension id **`sail.fdc3`**. Depends on `@finos/sail-headless-agent` and
platform `sail.platform.bus` / `session` / `catalog`.

## Model

`activate` is **isomorphic** (safe on Node for sail-v2-web). It exports:

| Constant | Capability | Role |
|---|---|---|
| `SAIL_FDC3_SERVER_FACTORY` | `sail.fdc3.serverFactory` | `createInstance` per user session |
| `SAIL_FDC3_REGISTER_MIDDLEWARE` | `sail.fdc3.registerMiddleware` | Factory-level receive/post hooks |
| `SAIL_FDC3_APP_CONTRIBUTION` | `sail.fdc3.appContribution` | App contributor registry (`registerSource` / `returnApps(sessionId)`) |
| `SAIL_FDC3_CHANNELS` | `sail.fdc3.channels` | Persisted user-channel catalog + membership |

UI contributions: `sail.ui.hidden` (WCP edge), `sail.ui.app.bar` (connection indicator).

WCP / MessagePort is **not** in `activate`. The `sail.ui.hidden` contribution
([`src/ui-hidden.ts`](./src/ui-hidden.ts) / [`src/wcp-edge.ts`](./src/wcp-edge.ts))
runs in the browser host page (or v2 **client**) and relays on `sail.platform.bus`
resolved via `SailExtensionUIProps.getExport`:

- App → DA: MessagePort → `bus.post` → `SailFDC3ServerInstance.receive`
- DA → App: `post` → `bus.post` → MessagePort

Hosts mount `sail.ui.hidden` with `{ storage, getExport }` (same capability map as
`activate`). No bus singleton.

```ts
import {
  SAIL_FDC3_SERVER_FACTORY,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
  SAIL_FDC3_APP_CONTRIBUTION,
  type SailFDC3ServerFactory,
  type RegisterMiddleware,
  type SailFdc3AppContribution,
} from "@finos/sail-extension-fdc3"

const factory = ctx.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)!
const registerMiddleware = ctx.getExport<RegisterMiddleware>(SAIL_FDC3_REGISTER_MIDDLEWARE)!
const appContribution = ctx.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)!

appContribution.registerSource("my-extension", {
  async returnApps(sessionId) {
    return loadAppsFor(sessionId)
  },
})

registerMiddleware({ receive: ... })

// Preferred host path:
const { agent, dispose, sessionId } = factory.createInstance(session)
const apps = await appContribution.retrieveAllApps(sessionId)
```

Hosts supply **only** `sail.platform.*` in `platformExports` — never shim `sail.fdc3.*`.
