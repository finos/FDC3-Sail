---
sidebar_position: 1
---

# @finos/sail-env

Tiny shared helpers so Sail host shells read the **same URL query params and Vite env keys** when
they boot a Desktop Agent. Used by [`sail-finance`](../sail-finance/overview),
[`sail-one`](../sail-one/overview), and [`sail-v2-web`](../sail-v2-web/overview).

**Location:** `packages/sail-env/`

This package does not implement FDC3, launch apps, or own conformance suite URLs. It parses strings
and exports one constant. Who injects which App Directory (for example the FINOS toolbox fixture)
is decided by the host or by [`@finos/sail-conformance-harness`](../conformance-harness/overview).

## Exports

| Export | Role |
|--------|------|
| `SAIL_MAX_FDC3_VERSION` | `"3.0"` — advertised max wire version hosts pass into `SailDesktopAgent` |
| `resolveDeepLinkAppId(search)` | `?appId=` → open that directory app after start |
| `resolveFdc3Directory(search)` | `?fdc3Directory=` → sole App Directory URL from the query |
| `resolveNoSplash(search)` | `?noSplash=1` / `true` → hide splash / welcome chrome |
| `resolveFdc3DirectoryUrl(raw)` | Non-empty check for `VITE_FDC3_DIRECTORY_URL` |
| `isAutoResolve(raw)` | `VITE_AUTO_RESOLVE === "1"` → programmatic intent pick |
| `resolveSoleFdc3Directory({ search, viteDirectoryUrl })` | Query `fdc3Directory` wins over Vite env |

## Query parameters

| Param | Effect |
|-------|--------|
| `appId` | Deep-link open that directory app after the agent starts |
| `fdc3Directory` | Use **only** this App Directory (overrides other catalogs) |
| `noSplash` | `1` or `true` — hide splash / welcome chrome when the host has it |

```
/?appId=Conformance1&fdc3Directory=https://example.com/apps.json&noSplash=1
```

## Vite env keys

Typed via `/// <reference types="@finos/sail-env/vite" />`:

| Variable | Effect |
|----------|--------|
| `VITE_FDC3_DIRECTORY_URL` | Default sole App Directory when `fdc3Directory` is absent |
| `VITE_AUTO_RESOLVE` | `"1"` → programmatic intent resolution (no picker UI) |

## Example

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
```

Hosts then construct `SailDesktopAgent` with `maxFdc3Version: SAIL_MAX_FDC3_VERSION`, optional sole
directory, auto-resolve intent UI, and deep-link open — see
[`sail-finance` `main.tsx`](https://github.com/finos/FDC3-Sail/blob/main/packages/sail-finance/src/main.tsx)
for a full wiring.

## Related

- [Packages overview](../overview)
- [Conformance harness](../conformance-harness/overview) — injects directory URLs / auto-resolve for toolbox runs
