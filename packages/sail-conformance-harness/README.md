# @finos/sail-conformance-harness

Minimal React host for the [FINOS FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) — wires only `@finos/sail-desktop-agent` (no full Sail stack). Toolbox runs assume `heartbeatEnabled: false` (matching Cucumber default); enable heartbeat only for dedicated heartbeat scenarios.

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview](https://finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview)

## Fixtures and toolbox results

| Path | Purpose |
|------|---------|
| `conformance-appd.json` | FINOS conformance app directory fixture (hosted URLs; shared with `sail-finance` dev) |
| `2.2-conformance-tests/` | Vendored FDC3 2.2 toolbox build, served at the harness origin (see `publicDir` in `vite.config.ts`). Unlike the hosted FINOS toolbox it carries the headless patch — see `HEADLESS.md` |
| `2.2-conformance-tests/directories/local-conformance.json` | App directory for the local profile: 18 apps, adds `Conformance1Headless`, drops the 404ing `IntentAppLId` |
| `src/conformance-app-directory.ts` | Picks the hosted fixture or the vendored local directory by profile (`VITE_CONFORMANCE_TOOLBOX=local`) |
| `e2e/conformance-baseline-2.2.json` | **Current headless 2.2 baseline** — the set of test titles allowed to fail |

## Run

From the monorepo root (`npm install` at repo root — shared dev tooling is hoisted from the root workspace):

```bash
npm run dev -w @finos/sail-conformance-harness
```

For **FDC3 2.2** (local toolbox profile):

```bash
npm run dev:local -w @finos/sail-conformance-harness
```

Dev server: **http://localhost:3001**. The harness page header shows the active toolbox profile and FDC3 target; `[ConformanceHarness]` startup lines appear on the **host page** DevTools console (not inside the Conformance1 iframe).

### Toolbox origin (hosted vs local FINOS)

The harness loads `conformance-appd.json` (hosted FINOS URLs) and optionally rewrites the toolbox base at bootstrap:

| Profile | Env | Toolbox origin | FDC3 target |
|---------|-----|----------------|-------------|
| Hosted (default) | — | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |
| Local FINOS dev | `VITE_CONFORMANCE_TOOLBOX=local` | `http://localhost:3001` | 2.2 |

```bash
# Same as npm run dev:local (Vite --mode toolbox-local → .env.toolbox-local)
# Local FINOS toolbox on port 3001 (run FINOS `npm run dev` instead of the harness, or use another port for one of them)
npm run dev:local -w @finos/sail-conformance-harness
```

Hosted URLs include `/toolbox/fdc3-conformance` before `/apps/...`; the local profile instead loads `2.2-conformance-tests/directories/local-conformance.json`, whose URLs are already `http://localhost:3001/apps/...`. Those paths are served from the vendored toolbox build via Vite's `publicDir`, so mock apps load same-origin with the harness (required for `window.name` / WCP host-instance adoption) with no network dependency on `fdc3.finos.org`.

## Headless conformance runs

The vendored toolbox supports unattended runs via `?suite=` (full contract in [`HEADLESS.md`](./HEADLESS.md)). The harness exposes this through an `?appId=` parameter:

```
http://localhost:3001/?appId=Conformance1Headless
```

Playwright drives that end to end:

```bash
npm run test:conformance -w @finos/sail-conformance-harness
```

A full run is ~5 minutes and writes to `artifacts/`: `conformance.json` (the raw result payload), `conformance.png` (full-height `#mocha` list), `conformance-junit.xml`, and `conformance-diff.json`.

The suite is gated on **regressions against `e2e/conformance-baseline-2.2.json`**, not on zero failures — the baseline records which titles are currently allowed to fail. When a run fixes one, the spec says so and you refresh the baseline from `artifacts/conformance.json`.

On images that ship their own Chromium at a build number Playwright does not expect, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the binary rather than re-downloading.

### Known flakiness

Reference runs scored 83/84 and 81/84. The difference is **not** noise in the numbers alone — the failures move between tests. Both runs hit `App didn't return close context within 1 sec`, but on different tests, and the second run's `getAppMetadata` instanceId mismatch (`'unknown-md2-id'`) looks like a knock-on from the un-torn-down instance.

That points at a teardown race between the mock app's `fdc3.close()` and the harness closing the browsing context — worth fixing at source rather than absorbing into the baseline. Until then the three affected titles are baselined so the gate is not red at random; the spec will report them as `fixed` once the race is resolved.

## Session teardown

Launched mock apps (`forceNewWindow`) open in **script-closable popup windows**: the host opens `about:blank` with window features, then navigates to the FINOS mock URL so `AppLauncher.close` can destroy the container when mocks call `fdc3.close()` (FINOS mocks do not call `window.close()`). Instances are **pre-registered** before `window.open` so WCP4 adopts the host `instanceId`. On `fdc3.close()` or agent disconnect, the harness closes the browsing context (popup registry or WCP `source` window), removes the panel entry, and calls `disconnectInstance`.

```bash
npm test -w @finos/sail-conformance-harness
npm run typecheck -w @finos/sail-conformance-harness
```
