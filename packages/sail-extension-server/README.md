# @finos/sail-extension-server

Node / Vite tooling for Sail extensions. Two roles:

1. **Single-extension authoring** — `sail-extension-server` CLI / `startExtensionServer`
   serves one package on a dedicated port (out-of-tree / local authoring).
2. **Host bundling** — `createExtensionsJsonVitePlugin`, `ensureExtensionsJson`,
   `discoverExtensions`, etc. wire monorepo `extensions/` into a Sail host
   (`extensions.json` + `/extensions/…` same-origin assets).

The isomorphic contract (`SailExtensionRegistry`, `StoredExtension` types, HTTP
`loadActiveExtensionManifestUrls`) stays in `@finos/sail-extension`.

## Host Vite plugin

```ts
import path from "node:path"
import { createExtensionsJsonVitePlugin } from "@finos/sail-extension-server"

createExtensionsJsonVitePlugin({
  root: packageRoot,
  extensionsDir: path.resolve(packageRoot, "../../extensions"),
})
```

Ensures host-root `extensions.json` (gitignored, auto-seeded), serves
`/extensions/<dir>/…` and `GET /extensions.json`, and emits extension entries
into `dist` on build. Edit enablement by changing the file on disk; next host
boot picks it up.

Node hosts (e.g. sail-v2-web server) can use:

```ts
import {
  defaultStoredExtensions,
  loadActiveExtensionManifestUrlsFromDisk,
} from "@finos/sail-extension-server"
```

## Single-extension authoring

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
sail-extension-server --root /path/to/extension --port 9101
```

`--root` defaults to cwd. `--port` defaults to `9100`
(`SAIL_EXTENSION_PORT` / `SAIL_EXTENSION_ROOT` also work).

Default Sail host `dev` uses the host plugin above instead of these ports.

## License

Copyright 2026 FINOS. Distributed under the Apache 2.0 License.
