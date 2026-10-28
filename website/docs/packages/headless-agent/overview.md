---
sidebar_position: 1
---

# @finos/sail-headless-agent

Headless FDC3 **DACP** implementation used by Sail Desktop Agents. It owns channel state, intents,
open/close, and heartbeat for wire versions **2.2** and **3.0** behind `FDC3ServerInstance`.

**Location:** `packages/sail-headless-agent/`

## What it does

- Shared agent state in `FDC3ServerInstance` / `AbstractFDC3ServerInstance`
- Version-specific handlers under `src/handlers/v2` and `src/handlers/v3`
- Per-connection `fdc3Version` (`"2.2"` | `"3.0"`); `receive()` routes to the matching handler set

Browser WCP / `MessagePort` hosting lives in [`@finos/sail-browser-agent`](../browser-agent/overview).
The older Socket.IO shell [`@finos/fdc3-sail-web`](../sail-v2-web/overview) also consumes this engine
directly.

`hostManifests.sail` (singleton, autostart, invisible, …) and how `raiseIntent`
targets `{ appId }` vs `{ appId, instanceId }` are documented in
`packages/sail-headless-agent/README.md`. A raise that names only `appId`
launches a new instance, unless the app is a **singleton that is already
running** — then the live instance is reused.

## Tests

Engine behaviour is covered by **Cucumber** feature files under `test/features/v2/` and `v3/` — not
by the FINOS conformance toolbox. See [BDD inventory](./bdd) for the generated file list and area
traceability. Live-browser conformance against product hosts is documented under
[`@finos/sail-conformance-harness`](../conformance-harness/overview).

```bash
npm test -w @finos/sail-headless-agent
```

## Related

- [Packages overview](../overview) — how this engine sits under browser hosts and shells
- [Browser agent](../browser-agent/overview) — WCP edge and host contracts
- [Conformance harness](../conformance-harness/overview) — FINOS toolbox against shells
