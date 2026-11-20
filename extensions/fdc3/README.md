# @finos/sail-extension-fdc3

Sail extension id **`sail.fdc3`**. Depends on `@finos/sail-headless-agent` and
platform `sail.platform.bus` / `session` / `catalog`.

## Model

`activate` is **isomorphic** (safe on Node for sail-v2-web). It binds a Desktop
Agent to the single platform user session and exports:

| Constant | Capability | Role |
|---|---|---|
| `SAIL_FDC3_INSTANCE` | `sail.fdc3.instance` | Middleware-wrapped `FDC3ServerInstance` (ready after session create) |
| `SAIL_FDC3_INTENT_RESOLVER` | `sail.fdc3.intentResolver` | Host UI methods (`onRequest` / `select` / `cancel`) |
| `SAIL_FDC3_REGISTER_MIDDLEWARE` | `sail.fdc3.registerMiddleware` | Receive/post hooks |
| `SAIL_FDC3_APP_CONTRIBUTION` | `sail.fdc3.appContribution` | App contributor registry (`registerSource` / `returnApps()`) |
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
  SAIL_FDC3_INSTANCE,
  SAIL_FDC3_INTENT_RESOLVER,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
  SAIL_FDC3_APP_CONTRIBUTION,
  type RegisterMiddleware,
  type SailFdc3AppContribution,
  type IntentResolverUIMethods,
} from "@finos/sail-extension-fdc3"
import type { FDC3ServerInstance } from "@finos/sail-headless-agent"

const instance = ctx.getExport<FDC3ServerInstance>(SAIL_FDC3_INSTANCE)!
const intentResolver = ctx.getExport<IntentResolverUIMethods>(SAIL_FDC3_INTENT_RESOLVER)!
const registerMiddleware = ctx.getExport<RegisterMiddleware>(SAIL_FDC3_REGISTER_MIDDLEWARE)!
const appContribution = ctx.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)!

appContribution.registerSource("my-extension", {
  async returnApps() {
    return loadApps()
  },
})

registerMiddleware({ receive: ... })

// After the host creates the platform session:
await instance.open("my-app")
const apps = await appContribution.retrieveAllApps()
```

Hosts supply **only** `sail.platform.*` in `platformExports` — never shim `sail.fdc3.*`.
