---
sidebar_position: 1
---

# @finos/sail-conformance-harness

Minimal React host that wires **only** `@finos/sail-desktop-agent` to run the [FINOS FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) live in a browser. Use as a diagnostic clean room compared to the full Sail stack (no workspace layer, no shell UI). This is a different conformance signal from the Cucumber BDD scenarios documented on the [Desktop Agent conformance traceability](../desktop-agent/conformance) page — that suite runs against `MockTransport`; this harness runs the toolbox against a real browser and WCP.

**Location:** `packages/sail-conformance-harness/`

## Quick start

From the monorepo root (install dependencies there — Vite, TypeScript, and Vitest are hoisted from the root workspace):

```bash
nvm use 24
cd FDC3-Sail
npm install
npm run dev:conformance
```

Dev server: **http://localhost:3001**

Equivalent: `npm run dev -w @finos/sail-conformance-harness`

```bash
npm test -w @finos/sail-conformance-harness
npm run typecheck -w @finos/sail-conformance-harness
```

## Architecture

- **`SailDesktopAgent`** — local DA + WCP browser app connection, nothing above it
- **App directory** — `packages/sail-conformance-harness/conformance-appd.json` via the `apps` option (sail-finance dev merges the same fixture)
- **Intent resolution** — `intentResolver` host controller with programmatic handler selection
- **Instance identity** — iframe `name` must equal `instanceId` for WCP4 correlation

## Toolbox origin: hosted vs local FINOS dev **`[implemented]`**

By default the harness points the toolbox at the hosted FINOS instance. A local mode exists for
developing against a FINOS toolbox checkout instead, controlled by the `VITE_CONFORMANCE_TOOLBOX`
Vite env var (via `packages/sail-conformance-harness/.env.toolbox-local`):

| Profile | Env | Toolbox origin | FDC3 target |
|---|---|---|---|
| Hosted (default) | — | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |
| Local FINOS dev | `VITE_CONFORMANCE_TOOLBOX=local` | `http://localhost:3001` | 2.2 |

```bash
npm run dev:local -w @finos/sail-conformance-harness
```

The harness's own app directory (`conformance-appd.json`) always uses hosted FINOS URLs;
`src/conformance-app-directory.ts` rewrites their origin to `localhost:3001` at bootstrap when
the local profile is active, and Vite proxies `/apps`, `/lib`, and a couple of static asset paths
back to the hosted toolbox so the rewritten same-origin URLs still resolve. Same-origin loading is
required for `window.name` / WCP4 host-instance adoption to work.

`sail-finance` has an equivalent `dev:local` mode (`npm run dev:local -w @finos/sail-finance`) that
runs the same origin rewrite against its own dev server instead of the harness's — it always merges this
fixture into its app directory, in every dev mode; `toolbox-local` only changes which origin the
mock apps resolve to. See
[FDC3 conformance traceability — toolbox local dev](../desktop-agent/conformance#toolbox-local-dev-toolbox-local--vite_conformance_toolbox-implemented)
for both paths side by side.

## Headless baseline

The Playwright suite (`npm run test:conformance -w @finos/sail-conformance-harness`) gates on
`e2e/conformance-baseline-2.2.json` — currently empty, so every toolbox test must pass. Run
output lands in gitignored `artifacts/`. See
[Conformance baseline status](../desktop-agent/conformance#conformance-baseline-status)
for the current score.

## Related

- [Desktop Agent conformance traceability](../desktop-agent/conformance) — the Cucumber BDD
  inventory (a different signal from the live toolbox this harness runs).
- [Integrator guide](../desktop-agent/integrator-guide)
