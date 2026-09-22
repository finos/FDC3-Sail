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

## Tests

Cucumber features are split by version:

- `test/features/v2/` — FDC3 2.2 scenarios (legacy Sail suite)
- `test/features/v3/` — FDC3 3.0 scenarios (copied from `@finos/fdc3-web-impl`)

Both suites run under `npm test`. Apps are registered with `fdc3Version` based on the feature path.
