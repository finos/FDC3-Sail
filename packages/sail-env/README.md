# `@finos/sail-env`

Tiny shared helpers so Sail host shells (`sail-finance`, `sail-one`, `sail-v2-web`, …) read the
**same URL query params and Vite env keys** when they boot a Desktop Agent.

This package does not talk to FDC3, open apps, or configure the conformance toolbox. It only
parses strings and exports one constant.

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/sail-env/overview](https://finos.github.io/FDC3-Sail/docs/packages/sail-env/overview)

## What it exports

| Export | Role |
|--------|------|
| `SAIL_MAX_FDC3_VERSION` | `"3.0"` — value hosts pass as advertised max wire version to `SailDesktopAgent` |
| `resolveDeepLinkAppId(search)` | `?appId=` → open that directory app after start |
| `resolveFdc3Directory(search)` | `?fdc3Directory=` → sole App Directory URL from the query |
| `resolveNoSplash(search)` | `?noSplash=1` / `true` → hide splash / welcome chrome |
| `resolveFdc3DirectoryUrl(raw)` | Non-empty check for `VITE_FDC3_DIRECTORY_URL` |
| `isAutoResolve(raw)` | `VITE_AUTO_RESOLVE === "1"` → programmatic intent pick |
| `resolveSoleFdc3Directory({ search, viteDirectoryUrl })` | Query `fdc3Directory` wins over Vite env |

Vite host typings:

```ts
/// <reference types="@finos/sail-env/vite" />
```

Declares `import.meta.env.VITE_FDC3_DIRECTORY_URL` and `VITE_AUTO_RESOLVE`.

## Typical host usage

```ts
import {
  SAIL_MAX_FDC3_VERSION,
  isAutoResolve,
  resolveDeepLinkAppId,
  resolveSoleFdc3Directory,
} from "@finos/sail-env"

const soleDirectoryUrl = resolveSoleFdc3Directory({
  search: window.location.search,
  viteDirectoryUrl: import.meta.env.VITE_FDC3_DIRECTORY_URL,
})
const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
const deepLinkAppId = resolveDeepLinkAppId(window.location.search)

// then: construct SailDesktopAgent with maxFdc3Version: SAIL_MAX_FDC3_VERSION,
// optional sole directory, auto-resolve intent UI, and deep-link open
```

Example URL:

```
/?appId=Conformance1&fdc3Directory=https://example.com/apps.json&noSplash=1
```

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
