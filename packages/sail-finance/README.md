# @finos/sail-finance

Browser deployment of FDC3 Sail — React host for the Desktop Agent, workspace UI, and FDC3 apps in iframes.

## Documentation

[finos.github.io/FDC3-Sail/docs/packages/sail-finance/overview](https://finos.github.io/FDC3-Sail/docs/packages/sail-finance/overview)

## Development

```bash
npm run dev                                # from monorepo root
npm run dev -w @finos/sail-finance
npm run dev:apps -w @finos/sail-finance    # plus the FDC3 example apps on :4005
```

Dev server: **http://localhost:3000**

Loads the public FINOS App Directory and the `@finos/fdc3-example-apps` directory (`http://localhost:4005/static/generated/fdc3-example-apps.json`, served by `npm run apps`).

| Option | Effect |
|--------|--------|
| `?appId=<id>` | Open that app once the directories load |
| `?fdc3Directory=<url>` or `VITE_FDC3_DIRECTORY_URL` | Load only that directory |
| `VITE_AUTO_RESOLVE=1` | Resolve intents with no UI |

Apps whose manifest sets `hostManifests.sail.forceNewWindow` open in their own browser tab. For conformance runs, see `@finos/sail-conformance-harness`.
