# `@finos/sail-env`

Shared **generic** host bootstrap helpers for Sail Desktop Agent shells (`sail-one`, `sail-finance`, `sail-v2-web`).

This package does **not** know about FDC3 conformance suites. Suite App Directory URLs and matrix cell mapping live in [`@finos/sail-conformance-harness`](../sail-conformance-harness/).

## FDC3 version model

Sail has **no canonical FDC3 version**. Each app requests a version on connect (WCP / APP_HELLO). The Desktop Agent uses the matching handler set (`2.2` or `3.0`) or **rejects** unsupported versions. Hosts advertise maximum support via `SAIL_MAX_FDC3_VERSION` (`"3.0"`).

Harness env `CONFORMANCE_FDC3_VERSION` only selects which toolbox suite and which App Directory URL to inject into the host — it does not pin the DA wire stack.

## Query parameters

| Param | Values | Effect |
|-------|--------|--------|
| `appId` | string | Deep-link open that directory app after the agent starts |
| `fdc3Directory` | absolute URL | Use **only** this App Directory (overrides other catalogs) |
| `noSplash` | `1` or `true` | Hide splash / welcome chrome when the host has it |

Example:

```
/?appId=Conformance1&fdc3Directory=https://…/website-conformance.json&noSplash=1
```

## Vite / process environment

| Variable | Values | Effect |
|----------|--------|--------|
| `VITE_FDC3_DIRECTORY_URL` | absolute URL | Default sole App Directory when `fdc3Directory` query is absent |
| `VITE_AUTO_RESOLVE` | `1` | Programmatic intent resolution (no picker UI) |

Host-only keys (not defined here): `VITE_FORCE_NEW_WINDOW` (`sail-one`), `VITE_CONFORMANCE_TOOLBOX` (harness Vite app).

## API

```ts
import {
  SAIL_MAX_FDC3_VERSION,
  resolveDeepLinkAppId,
  resolveFdc3Directory,
  resolveNoSplash,
  resolveFdc3DirectoryUrl,
  resolveSoleFdc3Directory,
  isAutoResolve,
} from "@finos/sail-env"
```

Vite types for host packages:

```ts
/// <reference types="@finos/sail-env/vite" />
```

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
