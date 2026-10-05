---
sidebar_position: 1
---

# @finos/sail-conformance-harness

Minimal React host that wires **only** `@finos/sail-browser-agent` to run the [FINOS FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) live in a browser. Use as a diagnostic clean room compared to the full Sail stack (no workspace layer, no shell UI). This is a different conformance signal from the Cucumber BDD scenarios documented on the [Desktop Agent conformance traceability](../browser-agent/conformance) page — that suite runs against `MockTransport`; this harness runs the toolbox against a real browser and WCP.

**Location:** `packages/sail-conformance-harness/`

## Quick start

From the monorepo root (install dependencies there — Vite, TypeScript, and Vitest are hoisted from the root workspace):

```bash
nvm use 24
cd FDC3-Sail
npm install
npm run dev:browser:2.2 -w @finos/sail-conformance-harness
```

Dev server: **http://localhost:3001**

```bash
npm test -w @finos/sail-conformance-harness
npm run typecheck -w @finos/sail-conformance-harness
```

## Architecture

- **`SailDesktopAgent`** — local DA + WCP browser app connection, nothing above it
- **App directory** — versioned local toolbox packages (`@robmoffat/fdc3-conformance-{2.2|3.0}`) via Vite `publicDir`, plus `conformance-appd.json` for hosted-origin rewrites when needed
- **Intent resolution** — `intentResolver` host controller with programmatic handler selection
- **Instance identity** — iframe `name` must equal `instanceId` for WCP4 correlation

## Local toolbox versions **`[implemented]`**

Interactive and Playwright runs use the **local** same-origin toolbox on `:3001` (required for `window.name` / WCP4 host-instance adoption):

| Script | Toolbox | FDC3 target |
|---|---|---|
| `dev:browser:2.2` / `test:browser:2.2` | `@robmoffat/fdc3-conformance-2.2` on `http://localhost:3001` | 2.2 |
| `dev:browser:3.0` / `test:browser:3.0` | `@robmoffat/fdc3-conformance-3.0` on `http://localhost:3001` | 3.0 |

```bash
npm run dev:browser:2.2 -w @finos/sail-conformance-harness
npm run dev:browser:3.0 -w @finos/sail-conformance-harness
```

`sail-finance` still has a `dev:local` mode (`npm run dev:local -w @finos/sail-finance`) that
rewrites conformance app URLs to its own origin. See
[FDC3 conformance traceability — toolbox local dev](../browser-agent/conformance#toolbox-local-dev-toolbox-local--vite_conformance_toolbox-implemented)
for that path.

## Playwright gate

The Playwright suite (`npm run test:browser:2.2 -w @finos/sail-conformance-harness`, also `test:browser:3.0`)
requires **zero** toolbox failures. Run output lands in gitignored `artifacts/`. See
[Playwright status](../browser-agent/conformance#playwright-status)
for the current score.

## Related

- [Desktop Agent conformance traceability](../browser-agent/conformance) — the Cucumber BDD
  inventory (a different signal from the live toolbox this harness runs).
- [Integrator guide](../browser-agent/integrator-guide)
