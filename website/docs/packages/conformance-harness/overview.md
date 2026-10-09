---
sidebar_position: 1
---

# @finos/sail-conformance-harness

Playwright **runner** that drives the [FINOS FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) against Sail product Desktop Agents. This is a different conformance signal from the Cucumber BDD scenarios documented on the [Desktop Agent conformance traceability](../browser-agent/conformance) page — that suite runs against `MockTransport`; this runner scrapes the live toolbox UI (`#mocha`) in Chromium.

**Location:** `packages/sail-conformance-harness/`

## Matrix (CI)

GitHub Actions (`.github/workflows/conformance.yml`) runs:

| Host | Port | Package |
|---|---|---|
| `sail-one` | 8090 | `@finos/sail-one` |
| `sail-finance` | 3000 | `@finos/sail-finance` |
| `sail-v2-web` | 8090 | `@finos/fdc3-sail-web` |

× FDC3 versions **`2.2`** and **`3.0`** (six cells, `fail-fast: false`).

### Toolbox sourcing

Suite App Directory URLs are owned by `@finos/sail-conformance-harness`. Hosts receive a concrete directory via `VITE_FDC3_DIRECTORY_URL` / `?fdc3Directory=` (see `@finos/sail-env` README in the monorepo).

| FDC3 version | Toolbox | App Directory |
|---|---|---|
| **3.0** | **Hosted** on `fdc3.finos.org` (no local toolbox process) | `https://fdc3.finos.org/toolbox/3.0/fdc3-conformance/directories/website-conformance.json` |
| **2.2** | **Local** — Playwright starts `@robmoffat/fdc3-conformance` on `:3001` | `http://localhost:3001/directories/localhost-conformance.json` |

Hosts are started with `VITE_AUTO_RESOLVE=1` (programmatic intent pick) and open Conformance1 via `?appId=Conformance1&fdc3Directory=<url>&noSplash=1`.

## Quick start (one cell)

From the monorepo root:

```bash
nvm use 24
cd FDC3-Sail
npm install
npm run test:browser:sail-finance:3.0 -w @finos/sail-conformance-harness
```

Other scripts: `test:browser:sail-one:2.2`, `test:browser:sail-v2-web:3.0`, etc. Or set env explicitly:

```bash
CONFORMANCE_HOST=sail-one CONFORMANCE_FDC3_VERSION=2.2 \
  npm run test:browser -w @finos/sail-conformance-harness
```

Artifacts land in gitignored `packages/sail-conformance-harness/artifacts/` (`conformance-<host>-<version>.json` / `.png`). The gate requires **zero** toolbox failures.

## Architecture

- **Runner** — Playwright config + `e2e/hosts.ts` + mocha scrape (`e2e/mocha-scrape.ts`)
- **Hosts under test** — product shells (`sail-one`, `sail-finance`, `sail-v2-web`), not this package’s Vite app
- **Optional local host** — the React harness under `src/` remains for browser-agent debugging (`dev:browser:*`); CI does not use it as the SUT
- **Intent resolution** — `createProgrammaticIntentResolver` from `@finos/sail-browser-agent` when `VITE_AUTO_RESOLVE=1`

## Related

- [Desktop Agent conformance traceability](../browser-agent/conformance) — Cucumber BDD inventory (different signal).
- [Integrator guide](../browser-agent/integrator-guide)
