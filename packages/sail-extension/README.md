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

The address of a core is a URL. Every host `import()`s that string:

```ts
const core = pickSailExtension(await import("https://example.com/my-extension/index.js"))
```


For each module recognised as a `SailExtension`, the  `pickSailExtension` function will:

1. Call `wrapServer` if present, passing a `SailExtensionContext` whose
   `storage` is namespaced to that extension.
2. Call `getUIExtensions()` for `{ type, url }` contributions.
3. Load each UI module and keep the `SailExtensionUI` values
   (`pickSailExtensionUIs`) whose `type` the host has a slot for.



### Local development (`@finos/sail-extension-server`)

Add the host as a dev dependency of the extension and a `dev` script that
serves **this package** on its port:

```json
{
  "scripts": {
    "dev": "sail-extension-server --port 9100"
  },
  "devDependencies": {
    "@finos/sail-extension-server": "*"
  }
}
```

```bash
npm run dev
```

Each extension will run on one origin.

```ts
const core = pickSailExtension(await import("http://localhost:9100/src/index.ts"))
```

## License

Copyright 2026 FINOS. Distributed under the Apache 2.0 License.
