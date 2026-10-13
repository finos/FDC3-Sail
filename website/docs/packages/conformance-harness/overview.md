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

- **`SailDesktopAgent`**: local DA + WCP browser app connection, nothing above it
- **App directory**: `conformance-appd.json` (hosted URLs, `npm run dev`), or the chosen toolbox's own directory (`dev:browser:2.2` / `dev:browser:3.0`)
- **Intent resolution**: `createProgrammaticIntentResolver` from `@finos/sail-desktop-agent`
- **Instance identity**: iframe `name` must equal `instanceId` for WCP4 correlation

## Choosing a suite

The tests come from npm (`@robmoffat/fdc3-conformance`, one alias per FDC3 version), not from this
repo. `CONFORMANCE_FDC3_VERSION` (`2.2` default, or `3.0`) picks the version.
`CONFORMANCE_TOOLBOX` picks the source: `published` (default) or the path to a built local FDC3
`toolbox/fdc3-conformance` checkout.

```bash
npm run dev:browser:2.2 -w @finos/sail-conformance-harness
```

The `dev:browser:*` scripts serve the chosen toolbox site as Vite's `publicDir` on
`http://localhost:3001`, so the mock apps load same-origin with the harness.

## CI matrix

The Playwright suite runs the toolbox against the product hosts, not this harness. See
[FINOS toolbox runs](../desktop-agent/conformance#finos-toolbox-runs-implemented).

## Related

- [Desktop Agent conformance traceability](../desktop-agent/conformance) — the Cucumber BDD
  inventory (a different signal from the live toolbox this harness runs).
- [Integrator guide](../desktop-agent/integrator-guide)
