# @finos/sail-finance

Sail host shell — React workspace UI that composes `@finos/sail-platform` and loads agent features (including FDC3) as **extensions** at runtime. The shell itself has no FDC3 package imports, AppD fetching, or channel/intent UI.

## Documentation

[fdc3-sail.finos.org/docs/packages/sail-finance/overview](https://fdc3-sail.finos.org/docs/packages/sail-finance/overview)

## Development

```bash
npm run dev          # from monorepo root
npm run dev -w @finos/sail-finance
```

Dev server: **http://localhost:3000**

Extensions under `extensions/` (e.g. `sail.fdc3`, directories, channels) are discovered via `sail-extension-server`'s `extensions.json` Vite plugin — they are not declared as finance dependencies.

App directory seeding and FDC3 conformance toolbox runs live in `@finos/sail-conformance-harness` / the FDC3 directories extension, not in this shell.
