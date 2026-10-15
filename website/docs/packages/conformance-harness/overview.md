---
sidebar_position: 1
---

# @finos/sail-conformance-harness

Playwright **runner** that drives the [FINOS FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) against Sail **product hosts**. This is the live-browser / WCP conformance signal.

It is **not** the Cucumber DACP suite in `@finos/sail-headless-agent` — that engine inventory lives on the [BDD inventory](../headless-agent/bdd) page.

**Location:** `packages/sail-conformance-harness/`

## Hosts under test

Conformance applies to the Desktop Agent **as shipped in product shells**, not to `sail-browser-agent` alone:

| Host | Port | Package | Notes |
|---|---|---|---|
| `sail-one` | 8090 | [`@finos/sail-one`](../sail-one/overview) | Domain-neutral tab-and-grid shell |
| `sail-finance` | 3000 | [`@finos/sail-finance`](../sail-finance/overview) | Finance workspace shell |
| `sail-v2-web` | 8090 | [`@finos/fdc3-sail-web`](../sail-v2-web/overview) | Previous Socket.IO Sail UI (`packages/sail-v2-web`) |

Each host × FDC3 versions **`2.2`** and **`3.0`** (six CI cells, `fail-fast: false`). See [Packages overview](../overview) for how these shells relate to the engine.

## Matrix (CI)

GitHub Actions (`.github/workflows/conformance.yml`) runs the six cells above. Artifacts land in gitignored `packages/sail-conformance-harness/artifacts/` (`conformance-<host>-<version>.json` / `.png`). The gate requires **zero** toolbox failures.

### Toolbox sourcing

Suite App Directory URLs are owned by `@finos/sail-conformance-harness`. Hosts receive a concrete directory via `VITE_FDC3_DIRECTORY_URL` / `?fdc3Directory=` (see [`@finos/sail-env`](../sail-env/overview)).

| FDC3 version | Toolbox | App Directory |
|---|---|---|
| **3.0** | **Local** — Playwright starts `@robmoffat/fdc3-conformance@3.0.0-beta.1` on `:3001` | `http://localhost:3001/directories/localhost-conformance.json` |
| **2.2** | **Local** — Playwright starts `@robmoffat/fdc3-conformance@2.2.3-test.1` on `:3001` | `http://localhost:3001/directories/localhost-conformance.json` |

Hosts are started with `VITE_AUTO_RESOLVE=1` (programmatic intent pick) and open Conformance1 via `?appId=Conformance1&fdc3Directory=<url>&noSplash=1`.

## Quick start (one cell)

Install once from the monorepo root (`npm install`), then work from this package:

```bash
cd packages/sail-conformance-harness
npm run test:browser:sail-finance:3.0
```

Host × version scripts: `test:browser:sail-one:2.2`, `test:browser:sail-v2-web:3.0`, and so on. Or set env explicitly:

```bash
cd packages/sail-conformance-harness
CONFORMANCE_HOST=sail-one CONFORMANCE_FDC3_VERSION=2.2 npm run test:browser
```

Convenience aliases (default host `sail-finance`):

```bash
cd packages/sail-conformance-harness
npm run test:browser:2.2
npm run test:browser:3.0
```

### Local toolbox host (debugging)

```bash
cd packages/sail-conformance-harness
npm run dev:browser:2.2
npm run dev:browser:3.0
```

| Script | Toolbox | FDC3 target |
|---|---|---|
| `dev:browser:2.2` / `test:browser:2.2` | `@robmoffat/fdc3-conformance-2.2` on `http://localhost:3001` | 2.2 |
| `dev:browser:3.0` / `test:browser:3.0` | `@robmoffat/fdc3-conformance-3.0` on `http://localhost:3001` | 3.0 |

The optional React app under `src/` is for browser-agent debugging; CI uses the product shells as the system under test.

## CI

`.github/workflows/conformance.yml` runs the six-cell matrix on every **pull request**, nightly at **03:00 UTC**, and on demand via **`workflow_dispatch`**. Any toolbox failure fails the job; artifacts upload either way.

:::note
GitHub only fires **scheduled** workflows from the repository **default branch**. On feature branches use the PR check or `workflow_dispatch`.
:::

## Architecture

- **Runner** — Playwright config + `e2e/hosts.ts` + mocha scrape (`e2e/mocha-scrape.ts`)
- **Hosts under test** — `sail-one`, `sail-finance`, `sail-v2-web`
- **Intent resolution** — `createProgrammaticIntentResolver` from `@finos/sail-browser-agent` when `VITE_AUTO_RESOLVE=1`

## Related

- [Packages overview](../overview) — dependency diagram
- [Engine BDD inventory](../headless-agent/bdd) — Cucumber DACP suite (different signal)
- [Integrator guide](../browser-agent/integrator-guide)
