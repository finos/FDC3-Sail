# @finos/sail-conformance-harness

Minimal React host for the [FDC3 conformance toolbox](https://fdc3.finos.org/toolbox/fdc3-conformance/) — wires only `@finos/sail-desktop-agent` (no full Sail stack). Local 2.2 runs use the published static site from `@robmoffat/fdc3-conformance`.

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview](https://finos.github.io/FDC3-Sail/docs/packages/conformance-harness/overview)

## Fixtures and toolbox results

| Path | Purpose |
|------|---------|
| `conformance-appd.json` | Hosted FINOS conformance app directory fixture (hosted profile) |
| `@robmoffat/fdc3-conformance` | Published FDC3 2.2 toolbox `dist/`, served as Vite `publicDir` (local profile) |
| `e2e/conformance-baseline-2.2.json` | Titles currently allowed to fail under the Playwright gate |

## Run

From the monorepo root:

```bash
npm run dev -w @finos/sail-conformance-harness
```

For **FDC3 2.2** (local toolbox profile):

```bash
npm run dev:local -w @finos/sail-conformance-harness
```

Dev server: **http://localhost:3001**. Open `/?appId=Conformance1`, choose suite **All**, and click **Run**.

| Profile | Env | Toolbox origin | FDC3 target |
|---------|-----|----------------|-------------|
| Hosted (default) | — | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |
| Local | `VITE_CONFORMANCE_TOOLBOX=local` | `http://localhost:3001` | 2.2 |

## Playwright conformance runs

```bash
npm run test:conformance -w @finos/sail-conformance-harness
```

The e2e spec opens `Conformance1`, selects **All**, clicks **Run**, and polls `#mocha` until results are stable. Artifacts land in `artifacts/` (`conformance.json`, screenshot, junit, diff). The gate is regressions against `e2e/conformance-baseline-2.2.json`.

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
