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
} from "@finos/sail-env"

const autoResolve = isAutoResolve(import.meta.env.VITE_AUTO_RESOLVE)
const deepLinkAppId = resolveDeepLinkAppId(window.location.search)
```

Hosts construct `SailDesktopAgent` with `maxFdc3Version: SAIL_MAX_FDC3_VERSION`, auto-resolve, and
deep-link open. Sole AppD (`?fdc3Directory=` / `VITE_FDC3_DIRECTORY_URL`) is owned by
`sail.fdc3.directories`. See
[`sail-finance` `main.tsx`](https://github.com/finos/FDC3-Sail/blob/main/packages/sail-finance/src/main.tsx)
for host wiring.

## Related

- [Packages overview](../overview)
- [Conformance harness](../conformance-harness/overview) — injects directory URLs / auto-resolve for toolbox runs
