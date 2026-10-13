# @finos/sail-conformance-harness

Runs the [FINOS FDC3 conformance suite](https://fdc3.finos.org/toolbox/fdc3-conformance/) against `@finos/sail-desktop-agent`, two ways:

- **Playwright matrix**: opens the suite in a product host (`sail-one` or `sail-finance`), clicks Run, scrapes the results. This is what CI runs.
- **Harness dev host**: a minimal React host that wires only `@finos/sail-desktop-agent`, for debugging the agent by hand.

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview](https://finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview)

## Choosing a suite

The conformance tests come from npm, not from this repo: two aliases of `@robmoffat/fdc3-conformance`, one per FDC3 version. Bump the version in `package.json` to update them.

| Env var | Values | Default |
|---------|--------|---------|
| `CONFORMANCE_FDC3_VERSION` | `2.2`, `3.0` | `2.2` |
| `CONFORMANCE_TOOLBOX` | `published` (the npm package), or the path to a built local checkout of FDC3 `toolbox/fdc3-conformance` | `published` |
| `CONFORMANCE_HOST` (Playwright only) | `sail-one`, `sail-finance` | `sail-finance` |

## Playwright matrix

From the monorepo root:

```bash
npm run test:browser:sail-finance:2.2 -w @finos/sail-conformance-harness
npm run test:browser:sail-one:2.2 -w @finos/sail-conformance-harness
# a local toolbox checkout instead of the published package
CONFORMANCE_TOOLBOX=~/FDC3/toolbox/fdc3-conformance npm run test:browser:2.2 -w @finos/sail-conformance-harness
```

Playwright starts two servers: the toolbox on **:3001** (Conformance1, the mock apps and `directories/localhost-conformance.json`) and the host with `VITE_FDC3_DIRECTORY_URL` (that directory only) and `VITE_AUTO_RESOLVE=1` (no intent resolver UI). It opens `/?appId=Conformance1` in the host.

A run fails on:

- any failing test;
- fewer tests than `e2e/expected-tests-<version>.json` lists;
- any listed test missing from the run.

It writes to `artifacts/`: `conformance-<host>-<version>.json` (every test and its state), `conformance-<host>-<version>.png` (the full `#mocha` list) and `conformance-junit.xml`. To refresh the expected list after the suite gains tests, copy the `suite / title` of each passing test from a clean run's JSON.

On images that ship their own Chromium at a build number Playwright does not expect, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the binary rather than re-downloading.

## Harness dev host

```bash
npm run dev -w @finos/sail-conformance-harness              # hosted FINOS toolbox, FDC3 3.0
npm run dev:browser:2.2 -w @finos/sail-conformance-harness  # chosen toolbox, served same-origin
npm run dev:browser:3.0 -w @finos/sail-conformance-harness
```

Dev server: **http://localhost:3001**. The `dev:browser:*` scripts serve the chosen toolbox site as Vite's `publicDir`, so the mock apps load same-origin with the harness. `[ConformanceHarness]` startup lines appear on the **host page** DevTools console, not inside the Conformance1 iframe.

| Path | Purpose |
|------|---------|
| `conformance-appd.json` | FINOS conformance app directory with hosted URLs (`npm run dev`) |
| `src/conformance-app-directory.ts` | Picks the hosted fixture, or the chosen toolbox's directory (`VITE_CONFORMANCE_TOOLBOX=local`) |
| `e2e/toolbox.ts` | Resolves `CONFORMANCE_FDC3_VERSION` and `CONFORMANCE_TOOLBOX` to a toolbox on disk |

```bash
npm test -w @finos/sail-conformance-harness
npm run typecheck -w @finos/sail-conformance-harness
```
