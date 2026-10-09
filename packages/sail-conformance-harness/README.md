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

## Run

From the monorepo root:

```bash
# Local toolbox packages (same-origin on http://localhost:3001) — preferred for WCP
npm run dev:browser:2.2 -w @finos/sail-conformance-harness
npm run dev:browser:3.0 -w @finos/sail-conformance-harness

# Published FINOS website apps (cross-origin iframes)
npm run dev:browser:web-2.2 -w @finos/sail-conformance-harness
npm run dev:browser:web-3.0 -w @finos/sail-conformance-harness
```

Open `/?appId=Conformance1`, choose suite **All**, and click **Run**.

| Script | Toolbox | FDC3 target |
|--------|---------|-------------|
| `dev:browser:2.2` | local package on `:3001` | 2.2 |
| `dev:browser:3.0` | local package on `:3001` | 3.0 |
| `dev:browser:web-2.2` | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 2.2 |
| `dev:browser:web-3.0` | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |

## Playwright conformance runs

```bash
npm run test:browser:2.2 -w @finos/sail-conformance-harness
npm run test:browser:3.0 -w @finos/sail-conformance-harness
npm run test:browser:web-2.2 -w @finos/sail-conformance-harness
npm run test:browser:web-3.0 -w @finos/sail-conformance-harness
```

The e2e spec opens `Conformance1`, selects **All**, clicks **Run**, and polls `#mocha` until Mocha's runner ends (or completed count matches the suite total). Artifacts land in `artifacts/`. The gate is **zero failures**. Nightly CI runs the host × version matrix (see `.github/workflows/conformance.yml`).

Both 2.2 and 3.0 cells serve the toolbox from `@robmoffat/fdc3-conformance` on `http://localhost:3001` (no hosted HTTPS apps in the Playwright matrix).

## License

Copyright 2025–2026 FINOS. Distributed under the Apache 2.0 License.
