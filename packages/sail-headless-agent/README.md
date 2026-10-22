# FDC3 Sail DACP Implementation

This package contains a headless implementation of the FDC3 DACP protocol used by FDC3-Sail.

It supports **both FDC3 2.2 and FDC3 3.0** wire formats in the same Desktop Agent session:

- Shared state lives in `FDC3ServerInstance` / `AbstractFDC3ServerInstance`
- Version-specific handlers live under `src/handlers/v2` and `src/handlers/v3`
- Each app connection stores a negotiated `fdc3Version` (`"2.2"` | `"3.0"`); `receive()` routes messages to the matching handler set

It is expected that Desktop Agent implementations can either use this package as the basis for their own FDC3 implementation, use the tests provided here to test their implementation, or take inspiration from the codebase.

## How This Works

There are three main types of component here:

- **MessageHandlers**: Core of the FDC3 implementation. Each version has four handlers: `BroadcastHandler` (channels and broadcasting), `IntentHandler`, `OpenHandler`, and `HeartbeatHandler`. Import `BroadcastHandlerV2` / `BroadcastHandlerV3` (etc.) from the package entry, or use the default names which alias the v2 handlers for backward compatibility.

- **FDC3ServerInstance**: Stores all shared channel/listener/pending state. `AbstractFDC3ServerInstance` implements the common logic and routes `receive()` by the sending app's `fdc3Version`.

- **HandlersByVersion**: A `Record<"2.2" | "3.0", MessageHandler[]>` passed into the server constructor (see `SailFDC3ServerFactory` in the web package).

## Sail Host Manifest

FDC3 App Directory records can include a per-host `hostManifests` object. Sail reads `hostManifests.sail` for launch and workspace behaviour that is not part of the standard AppD schema.

This package is the source of truth for that shape. It exports `SailHostManifest` (optional fields as written in AppD), `ResolvedSailHostManifest` (every field filled in), `SAIL_HOST_MANIFEST_DEFAULTS`, `parseSailHostManifest()`, and `sailHostManifestFromApp()`. Hosts such as `sail-v2-web` and `sail-one` call those helpers and apply the flags at launch or in the UI.

`parseSailHostManifest()` accepts an object, a JSON string, or a missing/invalid value. Non-boolean fields fall back to the defaults below.

| Flag | Default | Meaning |
|---|---|---|
| `forceNewWindow` | `false` | Open in a browser tab (`AppHosting.Tab`) instead of a workspace iframe (`AppHosting.Frame`). An explicit launch destination still wins. |
| `invisible` | `false` | Host off-grid. The iframe stays mounted (and keeps its FDC3 connection); the user sees it through a dialog rather than a grid panel. Close hides the dialog instead of tearing the instance down. |
| `singleton` | `false` | At most one live instance of this `appId`. A later `open` returns the existing instance; concurrent opens share the in-flight launch. |
| `autostart` | `false` | After the Desktop Agent is ready, ensure at least one live or pending instance of this `appId`. |
| `searchable` | `true` | Include the app in the Sail app directory / launcher. Set `false` to hide helper or conformance apps from the picker while still allowing `fdc3.open` and intent routing. |

Cardinality is `autostart` (≥ 1) combined with `singleton` (≤ 1). Both can be set together for a single always-on instance.

Example AppD fragment:

```json
{
  "appId": "portfolio-view",
  "title": "Portfolio View",
  "type": "web",
  "details": {
    "url": "https://apps.example.com/portfolio-view/"
  },
  "hostManifests": {
    "sail": {
      "singleton": true,
      "autostart": true,
      "searchable": true
    }
  }
}
```

## Tests

Cucumber features are split by version:

- `test/features/v2/` — FDC3 2.2 scenarios (legacy Sail suite)
- `test/features/v3/` — FDC3 3.0 scenarios (copied from `@finos/fdc3-web-impl`)

Both suites run under `npm test`. Apps are registered with `fdc3Version` based on the feature path.
