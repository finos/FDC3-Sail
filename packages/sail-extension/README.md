# @finos/sail-extension

Isomorphic contract for Sail Desktop Agent extensions. No Node APIs, no host
imports. Node / Vite host tooling lives in `@finos/sail-extension-server`.

## Manifest (`sail.extension.json`)

Host entry is the manifest URL. Validate against
[`sail.extension.schema.json`](./sail.extension.schema.json).

```json
{
  "$schema": "./sail.extension.schema.json",
  "id": "sail.demo",
  "title": "Message Log",
  "version": "0.0.1",
  "activation": { "module": "./src/activate.ts" },
  "extensionDependencies": ["sail.platform.bus"],
  "contributes": {
    "sail.ui.config": [{ "title": "Message Log", "module": "./src/ui.tsx" }]
  }
}
```

- **`extensionDependencies`**: capability ids that must exist before `activate`
  (not extension ids).
- **`exports`**: capability ids this extension publishes from `activate()`.
- **`contributes`**: VS Code–style map of extension-point id → contributions.
  Hosts define which point ids they mount (e.g. `@finos/sail-platform`
  `SAIL_UI_CONFIG` / `SAIL_UI_HIDDEN`). This package treats `type` as an opaque string.

## Host `extensions.json` (host-wide, not per-user)

Each host package keeps a **gitignored** root file `extensions.json`:

```json
[
  { "url": "/extensions/demo/sail.extension.json", "active": true },
  { "url": "/extensions/fdc3/sail.extension.json", "active": true }
]
```

`sail.fdc3` is active by default in the seed (`DEFAULT_INACTIVE_EXTENSION_IDS` is empty).

This package exports the isomorphic shape (`StoredExtension`,
`activeManifestUrls`, `loadActiveExtensionManifestUrls` via HTTP). Ensuring the
file, discovering `extensions/`, and the Vite host plugin are in
`@finos/sail-extension-server`.

```ts
import { loadActiveExtensionManifestUrls } from "@finos/sail-extension"
import { createExtensionsJsonVitePlugin } from "@finos/sail-extension-server"

await registry.load(await loadActiveExtensionManifestUrls())
```

Edit enablement by changing the host-root file on disk (not via `sail.ui.config`).
Changes apply on the **next host boot**.

## Activation

```ts
import type { SailExtensionContext, ActivateResult } from "@finos/sail-extension"
import { SAIL_PLATFORM_BUS, type SailPlatformBus } from "@finos/sail-platform"

export async function activate(ctx: SailExtensionContext): Promise<ActivateResult> {
  const bus = ctx.getExport<SailPlatformBus>(SAIL_PLATFORM_BUS)!
  ctx.subscriptions.push({
    dispose: bus.subscribe((message, instanceId) => {
      console.info(message, instanceId)
    }),
  })
  return {}
}
```

## Host load order

0. Pre-register `sail.platform.*` only (use `SAIL_PLATFORM_*` constants). Do **not** shim `sail.fdc3.*`.
1. Fetch each active `sail.extension.json` (from `extensions.json`).
2. Fail on duplicate capability ids.
3. Topo-sort by `extensionDependencies`; activate providers first (`sail.fdc3` then dependents).
4. `import(activation.module)` → `activate(ctx)` → register returned exports.
5. Mount `contributes[sail.ui.config]` and `contributes[sail.ui.hidden]`.
6. `factory.createInstance(session)` (or `applyQueuedMiddleware` for a host-built agent).

```ts
import { SailExtensionRegistry, loadActiveExtensionManifestUrls } from "@finos/sail-extension"
import {
  SAIL_PLATFORM_BUS,
  SAIL_PLATFORM_CATALOG,
  SAIL_PLATFORM_SESSION,
} from "@finos/sail-platform"

const registry = new SailExtensionRegistry({
  platformExports: {
    [SAIL_PLATFORM_BUS]: bus,
    [SAIL_PLATFORM_SESSION]: sessions,
    [SAIL_PLATFORM_CATALOG]: catalog,
  },
  createStorage: id => namespacedStorage(id),
})
await registry.load(await loadActiveExtensionManifestUrls())
```

## Platform vs extension capabilities

| Kind | Examples | Typed how |
|---|---|---|
| Platform (ambient) | `SAIL_PLATFORM_SESSION`, `.BUS`, `.CATALOG` | `@finos/sail-platform` constants + `getExport<T>` |
| Extension exports | `SAIL_FDC3_SERVER_FACTORY`, etc. | `@finos/sail-extension-fdc3` constants + `getExport<T>` |

## UI modules

A UI contribution module exports one or more `SailExtensionUI` values: opaque
`type` (contribution-point id) and a required `mount(el, props)` that returns an
unmount function. Hosts call `mount` with scoped `storage` and `getExport`; they
do not import React components from the extension.

## License

Copyright FINOS. Distributed under the Apache 2.0 License.
