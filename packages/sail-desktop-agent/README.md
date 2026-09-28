# @finos/sail-desktop-agent

Browser-first [FDC3 2.2](https://fdc3.finos.org/docs/api/spec) Desktop Agent — DACP handlers, channels, intents, app directory, and WCP app connection. One Desktop Agent per host page; FDC3 web apps connect via WCP and `MessagePort`.

The agent owns its app-connection edge. You implement `AppLauncher` and wire host UI — there is no transport to configure.

Platform concerns (layout, workspace, storage, Sail config) belong in [`@finos/sail-platform`](../sail-platform/README.md), not in this package.

## Documentation

Full documentation lives on the **FDC3 Sail docs site** (single source of truth):

| Topic | Link |
|-------|------|
| Overview & quick start | [finos.github.io/FDC3-Sail/docs/packages/desktop-agent/overview](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/overview) |
| **Integrator guide** (start here) | [finos.github.io/FDC3-Sail/docs/packages/desktop-agent/integrator-guide](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/integrator-guide) |
| Composition & diagrams | [finos.github.io/FDC3-Sail/docs/packages/desktop-agent/composition](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/composition) |
| Conformance traceability | [finos.github.io/FDC3-Sail/docs/packages/desktop-agent/conformance](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/conformance) |

## Install

```bash
npm install @finos/sail-desktop-agent
```

## Minimal example

```typescript
import { SailDesktopAgent } from "@finos/sail-desktop-agent"
import type { AppLauncher } from "@finos/sail-desktop-agent"

const desktopAgent = new SailDesktopAgent({
  appDirectories: ["/apps.json"],
  appLauncher: myAppLauncher,
})
desktopAgent.start()
// iframe apps can await fdc3.getAgent()
```

Inbound messages are validated against the FDC3 schema. The default `validation: "warn"`
logs failures and dispatches anyway; use `"strict"` to reject malformed messages, or
`"off"` to skip the check.

See the [integrator guide](https://finos.github.io/FDC3-Sail/docs/packages/desktop-agent/integrator-guide) for host contracts, intent resolution, channel chrome, and browser-first adoption.

## License

Copyright 2025 FINOS. Distributed under the Apache 2.0 License.
