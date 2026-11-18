# `@finos/sail-env`

Tiny shared helpers so Sail host shells (`sail-finance`, `sail-one`, `sail-v2-web`, …) and
extensions read the **same URL query params and Vite env keys** at boot.

This package does not talk to FDC3, open apps, or configure the conformance toolbox. It only
parses strings and exports one constant. Sole App Directory resolution is consumed by
`sail.fdc3.directories`, not by hosts.

## Documentation

[fdc3-sail.finos.org/docs/packages/sail-env/overview](https://fdc3-sail.finos.org/docs/packages/sail-env/overview)

## What it exports

| Function | Variable | Role | Used by |
|----------|----------|------|---------|
| | `SAIL_MAX_FDC3_VERSION` | `"3.0"` — advertised max wire version for `SailDesktopAgent` | `sail-one`, `sail-finance` |
| `resolveDeepLinkAppId(search)` | | `?appId=` → open that directory app after start | `sail-one`, `sail-finance`, `sail-v2-web` |
| `resolveNoSplash(search)` | | `?noSplash=1` / `true` → hide splash / welcome chrome | `sail-v2-web` |
| `isAutoResolve(raw)` | | `VITE_AUTO_RESOLVE === "1"` → programmatic intent pick | `sail-one`, `sail-finance`, `sail-v2-web` |
| `resolveFdc3Directory({ search, viteDirectoryUrl })` | | Sole App Directory URL from explicit inputs | `resolveBootFdc3DirectoryUrl` |
| `resolveBootFdc3DirectoryUrl()` | | Same resolution from live `location` / Vite / `process.env` | `sail.fdc3.directories` (on activate) |

### App Directory override order

First non-empty value wins:

1. `?fdc3Directory=` from the page query (`location.search`)
2. `import.meta.env.VITE_FDC3_DIRECTORY_URL`
3. `process.env.VITE_FDC3_DIRECTORY_URL` (Node)

Hosts do **not** call these — `sail.fdc3.directories` calls `resolveBootFdc3DirectoryUrl()` on activate.

Vite host typings (for `VITE_AUTO_RESOLVE` and related):

```ts
/// <reference types="@finos/sail-env/vite" />
```

## Typical host usage

```ts
import {
  SAIL_MAX_FDC3_VERSION,
  isAutoResolve,
  resolveDeepLinkAppId,
} from "@finos/sail-env"

const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

// Sole AppD (`?fdc3Directory=` / VITE_FDC3_DIRECTORY_URL) is handled by
// sail.fdc3.directories — not by the host.
```

Example URL:

```
/?appId=Conformance1&fdc3Directory=https://example.com/apps.json&noSplash=1
```

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
