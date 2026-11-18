# @finos/sail-extension-fdc3

Sail extension id **`sail.fdc3`**. Depends on `@finos/sail-headless-agent` and
platform `sail.platform.bus` / `session` / `catalog`.

## Model

`activate` is **isomorphic** (safe on Node for sail-v2-web). It exports:

| Constant | Capability | Role |
|---|---|---|
| `SAIL_FDC3_SERVER_FACTORY` | `sail.fdc3.serverFactory` | `createInstance` per user session |
| `SAIL_FDC3_REGISTER_MIDDLEWARE` | `sail.fdc3.registerMiddleware` | Factory-level receive/post hooks |
| `SAIL_FDC3_APP_DIRECTORY` | `sail.fdc3.appDirectory` | Source-scoped App Directory |

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
  SAIL_FDC3_APP_DIRECTORY,
  type SailFDC3ServerFactory,
  type RegisterMiddleware,
  type SailFdc3AppDirectory,
} from "@finos/sail-extension-fdc3"

const factory = ctx.getExport<SailFDC3ServerFactory>(SAIL_FDC3_SERVER_FACTORY)!
const registerMiddleware = ctx.getExport<RegisterMiddleware>(SAIL_FDC3_REGISTER_MIDDLEWARE)!
const appDirectory = ctx.getExport<SailFdc3AppDirectory>(SAIL_FDC3_APP_DIRECTORY)!

registerMiddleware({ receive: ... })

// Preferred host path:
const { agent, dispose } = factory.createInstance(session)

// Host-built agent (SocketIO / legacy SailDesktopAgent):
factory.applyQueuedMiddleware(registerMiddleware)
```

Hosts supply **only** `sail.platform.*` in `platformExports` — never shim `sail.fdc3.*`.
