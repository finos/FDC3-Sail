# @finos/sail-extension

Isomorphic contract for Sail Desktop Agent extensions. No Node APIs, no host
imports. The local Vite host lives in `@finos/sail-extension-server`.

## Contract

An extension is one **core** module plus any number of **UI** modules:

| Entry | Runs where | Exports |
|---|---|---|
| `index` (core) | Anywhere the `FDC3ServerInstance` lives | `SailExtension` — `id`, `title`, `getUIExtensions()`, optional `wrapServer` |
| each UI module | Browser only | one or more `SailExtensionUI` — `type`, `ConfigScreen`, optional `mount` |

`getUIExtensions()` returns `{ type, url }[]`. Hosts `import()` each URL and
keep the contributions whose `type` they have a slot for. Settings is
`sail.config` (`SAIL_CONFIG_UI`).

```ts
import { applyExtensions, SAIL_CONFIG_UI, type SailExtension } from "@finos/sail-extension"

export const demoExtension: SailExtension = {
  id: "demo",
  title: "Message Log",
  getUIExtensions() {
    return [{ type: SAIL_CONFIG_UI, url: new URL("./ui.tsx", import.meta.url).href }]
  },
  wrapServer(instance, ctx) {
    return applyExtensions(instance, {
      receive: async (message, from) => {
        const settings = await ctx.storage.get<{ enabled: boolean; label: string }>("settings")
        if (settings?.enabled) {
          instance.log(`[${settings.label}] ${message.type} from ${from}`)
        }
        return instance.receive(message, from)
      },
    })
  },
}
```

`applyExtensions` is a Proxy: it applies `Partial<FDC3ServerInstance>` overrides
and forwards host-specific methods.

### No internal state

Anything that must survive a remount lives in `SailExtensionStorage`. The host
namespaces keys (sail-one `ext/<id>/…`, v2-web `ClientState` bag).

## How a host loads extensions

A host obtains core modules however it wants. For each module it recognises as
a `SailExtension` (`pickSailExtension`):

1. Call `wrapServer` if present, passing a `SailExtensionContext` whose
   `storage` is namespaced to that extension.
2. Call `getUIExtensions()` for `{ type, url }` contributions.
3. Load each UI module and keep the `SailExtensionUI` values
   (`pickSailExtensionUIs`) whose `type` the host has a slot for.

Three usual ways to obtain a core:

### URL

`import()` any `https:` or `file:` URL of an ESM module. UI contributions use
the same kind of URL, resolved from that module’s `import.meta.url`.

```ts
const core = pickSailExtension(await import("https://example.com/my-extension/index.js"))
```

### npm

Add the package and import its specifier.

```ts
const core = pickSailExtension(await import("@finos/sail-extension-demo"))
```

### Local development (`@finos/sail-extension-server`)

While writing an extension, the Vite host serves source on port 9100 and lists
cores at `GET /extensions.json`. Merge that catalog with any pinned URLs
(`loadExtensionCoreUrls`) so the host picks them up without packing. Scan
roots are documented in that package.

```ts
const core = pickSailExtension(await import("http://localhost:9100/demo/src/index.ts"))
```

## License

Copyright 2026 FINOS. Distributed under the Apache 2.0 License.
