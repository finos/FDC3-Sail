# @finos/sail-extension-server

Dev-only Vite host for **writing new extensions**. It serves source from local
scan roots on **port 9100** so you can iterate without packing. It is not how
hosts load extensions in production.

Scan roots live in `src/scan-dirs.ts` (`SAIL_EXTENSION_SCAN_DIRS`, relative to
this package). The in-repo tree is one of them:

```ts
export const SAIL_EXTENSION_SCAN_DIRS: string[] = ["../../extensions"]
```

`SAIL_EXTENSION_DIRS` (colon-separated) appends more roots.

`GET /extensions.json` lists scanned cores as `{ id, title, core, file? }`.
Hosts typically merge that list with any pinned core URLs, then `import()` each
`core`. UI URLs come from the loaded module’s `getUIExtensions()`, not from the
catalog.
