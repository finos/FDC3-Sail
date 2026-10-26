# @finos/sail-extension-server

Dev-only Vite host for **one** Sail extension package. Run it from that
package’s directory. 

Put it on the extension as a `dev` script (see `extensions/demo`):

```json
{
  "scripts": {
    "dev": "sail-extension-server --port 9100"
  },
  "devDependencies": {
    "@finos/sail-extension-server": "*"
  }
}
```

```bash
npm run dev
# or, from elsewhere:
sail-extension-server --root /path/to/extension --port 9101
```

`--root` defaults to the current working directory. `--port` defaults to
`9100` (`SAIL_EXTENSION_PORT` / `SAIL_EXTENSION_ROOT` also work).

Vite’s `root` is the extension folder, so that package’s `node_modules`
resolve normally. JSX is esbuild-only (no React Fast Refresh) so a different
origin (`sail-v2-web`, `sail-one`) can `import()` the UI.
