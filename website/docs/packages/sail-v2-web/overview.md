---
sidebar_position: 1
---

# @finos/fdc3-sail-web (`sail-v2-web`)

Previous Socket.IO-based Sail UI. Still runnable, and still a **conformance host** in the Playwright
matrix, but the supported product path for new hosts is the browser-resident
[`@finos/sail-browser-agent`](../browser-agent/overview) shells (`sail-one`, `sail-finance`).

**Location:** `packages/sail-v2-web/` (npm name `@finos/fdc3-sail-web`)

Socket.IO protocol types, client/server session state, and App Directory helpers live in `src/common/`.

## What it does

- Hosts a Desktop Agent UI over Socket.IO rather than in-page WCP/`MessagePort`
- Consumes [`@finos/sail-headless-agent`](../headless-agent/overview) for DACP (**2.2** and **3.0**)
- Uses [`@finos/sail-env`](../sail-env/overview) for directory / deep-link bootstrap

## Run

```bash
npm run dev:v2
```

See the repository README for the full command reference.

## Conformance

`sail-v2-web` is one of the three product hosts exercised by
[`@finos/sail-conformance-harness`](../conformance-harness/overview) (`CONFORMANCE_HOST=sail-v2-web`).

## Related

- [Packages overview](../overview)
- [Headless agent](../headless-agent/overview)
- [Conformance harness](../conformance-harness/overview)
