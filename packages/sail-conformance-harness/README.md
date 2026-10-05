# @finos/sail-conformance-harness

Minimal React host for the [FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) — wires only `@finos/sail-browser-agent` (no full Sail stack). Local runs use published static sites from `@robmoffat/fdc3-conformance` (2.2 and 3.0 packages, aliased in this workspace).

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview](https://finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview)

## Fixtures and toolbox results

| Path | Purpose |
|------|---------|
| `conformance-appd.json` | Hosted FINOS conformance app directory fixture (hosted profile) |
| `@robmoffat/fdc3-conformance-2.2` | Published FDC3 2.2 toolbox `dist/`, Vite `publicDir` |
| `@robmoffat/fdc3-conformance-3.0` | Published FDC3 3.0 toolbox `dist/`, Vite `publicDir` |
| `e2e/conformance-baseline-2.2.json` | Titles allowed to fail under the Playwright gate (2.2) |
| `e2e/conformance-baseline-3.0.json` | Titles allowed to fail under the Playwright gate (3.0) |

## Run

From the monorepo root:

```bash
npm run dev -w @finos/sail-conformance-harness
```

Local toolbox (same-origin on **http://localhost:3001**):

```bash
# FDC3 2.2 (default)
npm run dev:local -w @finos/sail-conformance-harness

# FDC3 3.0
npm run dev:local:3.0 -w @finos/sail-conformance-harness
```

Open `/?appId=Conformance1`, choose suite **All**, and click **Run**.

| Profile | Env | Toolbox origin | FDC3 target |
|---------|-----|----------------|-------------|
| Hosted (default `npm run dev`) | — | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |
| Local 2.2 | `VITE_CONFORMANCE_TOOLBOX=local` | `http://localhost:3001` | 2.2 |
| Local 3.0 | `…` + `CONFORMANCE_FDC3_VERSION=3.0` | `http://localhost:3001` | 3.0 |

## Playwright conformance runs

```bash
npm run test:conformance:2.2 -w @finos/sail-conformance-harness
npm run test:conformance:3.0 -w @finos/sail-conformance-harness
```

The e2e spec opens `Conformance1`, selects **All**, clicks **Run**, and polls `#mocha` until Mocha's runner ends (or completed count matches the suite total). Artifacts land in `artifacts/`. The gate is regressions against the matching `e2e/conformance-baseline-*.json`. Nightly CI runs both versions as a matrix (see `.github/workflows/conformance.yml`).

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
