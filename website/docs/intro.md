---
sidebar_position: 1
slug: /
---

# Introduction

Financial and enterprise users rarely work in a single application. They move between pricing tools, order entry, portfolio views, research, and CRM — copying identifiers, re-keying context, and switching windows. **Interoperability** is what removes that friction: connected applications share context and actions so the user stays in flow, makes fewer mistakes, and finishes tasks faster.

## What FDC3 is

**[FDC3](https://fdc3.finos.org/)** (Financial Desktop Connectivity and Collaboration Consortium) is an open FINOS standard for **UI-level interoperability**. It defines how applications on a desktop or in a browser discover each other, share **context** (for example an instrument or portfolio), raise **intents** (“show this chart for this symbol”), and link via **channels** — without each vendor building bespoke integrations pairwise.

### UI control plane vs data plane

Most integration effort in large organisations goes into the **data plane** — APIs, messaging, ETL, and services that move business data between systems (prices, orders, positions, reference data).

FDC3 addresses the **UI control plane** — how applications **on the user's desktop or browser** coordinate with each other:

| Plane | What it connects | Typical examples |
|-------|------------------|------------------|
| **Data plane** | Back-end systems and services | REST APIs, Kafka, FIX, data warehouses |
| **UI control plane** | End-user applications in a workspace | Context share, intents, channels, app directory |

These are **complementary**, not competing. A trade might flow through the data plane while the user experience is orchestrated through the UI control plane — select an instrument in one app and linked apps update instantly, without custom glue code for every app pair.

```mermaid
flowchart LR
  subgraph data ["Data plane"]
    S1[System A]
    S2[System B]
    S1 <-->|"APIs / messaging"| S2
  end

  subgraph ui ["UI control plane — FDC3"]
    App1[FDC3 App 1]
    App2[FDC3 App 2]
    DA[Desktop Agent]
    App1 <-->|"context · intents · channels"| DA
    App2 <-->|"context · intents · channels"| DA
  end

  data -.->|"feeds the apps"| ui
```

## What Sail is

**FDC3 Sail** is a standards-compliant FDC3 **Desktop Agent** — an implementation of [FDC3 2.2](https://fdc3.finos.org/docs/api/spec) and [FDC3 For-The-Web](https://fdc3.finos.org/docs/api/specs/browserResidentDesktopAgents) that runs in the browser. Concretely, it does:

- **Intent resolution** — route intents between applications
- **Channel linking** — connect applications via user and app channels
- **Directory search** — discover and launch FDC3 applications via an app directory

FDC3 Sail implements the Desktop Agent and host wiring for the UI control plane above. Your FDC3 applications use the standard [`@finos/fdc3`](https://www.npmjs.com/package/@finos/fdc3) library and `getAgent()` — the same API regardless of which Sail path you choose.

### Is it a good fit for you?

FDC3 Sail is a **good fit** if you:

- Need a **browser FDC3 host** aligned with FDC3 2.2 and For-The-Web
- Want an **open-source** stack you can run, host, embed, or extend
- Have (or plan) **FDC3-compliant web applications** that call `fdc3.getAgent()`
- Prefer standards-based interoperability over one-off app-to-app integrations

Consider alternatives or additional work if you:

- Only need back-end system integration with no linked UI (data plane only)
- Require a mature vendor desktop with long-term support contracts today — evaluate Sail against your risk tolerance; the project is actively evolving with the standard
- Need **enterprise packaging** out of the box (SSO, MDM distribution, hardened installers, multi-tenant ops) — that remains your integration work regardless of which FDC3 host you choose

### Status

FDC3 Sail is **under active development** and not yet ready for production use (see the root [README](https://github.com/finos/FDC3-Sail)). It implements FDC3 2.2 (DACP, WCP) and works with the standard `@finos/fdc3` client library unchanged. Packaging Sail as an **enterprise system** — identity, deployment pipelines, operational monitoring, and IT policy — is a separate layer of work for your organisation.

## What Sail grows into

A single Desktop Agent is enough for a lot of hosts, but a real deployment usually needs more around it: pluggable persistence for workspaces and layouts, a lifecycle, and a place for host chrome to bind to instead of polling agent state. `@finos/sail-platform` composes the same Desktop Agent together with that scaffolding, growing Sail from a standalone engine into an **interoperability platform** — the layer that Sail's two example UIs are built on: [`sail-finance`](./packages/sail-finance/overview), a finance-specific shell, and `sail-one`, a domain-neutral one for more general use.

Most of that platform's intended business-readiness surface — telemetry, auth, entitlements, connectors — is **`[planned]`**, not built yet. The composition itself (construct → launch → resolve → persist) is real today. See the [Architecture Overview](./architecture/overview#two-entry-points) for exactly what's implemented versus planned.

## Composite parts

Package ownership, the two supported entry points, the host-contract surface, and the app-connection model all live in one place: the [Architecture Overview](./architecture/overview). That page owns the single layering diagram for these docs — this introduction links to it rather than redrawing it.

## How to consume it

Where you go next depends on what you are building:

```mermaid
flowchart TD
  Start([What do you need?])

  Start --> AddApp[Add an existing web app to Sail]
  Start --> Consume[Adopt or host Sail itself]
  Start --> Contribute[Contribute to Sail from source]

  AddApp --> Apps["Your FDC3 apps use @finos/fdc3 — getAgent()"]
  Consume -.-> HowTo[["How to consume Sail →"]]
  Contribute -.-> DevGuide[["Development Guide →"]]
```

| I want to… | Go to |
|------------|--------|
| **Add an existing web app to Sail or another FDC3 Desktop Agent** | [Add your app to Sail](./add-your-app) |
| **Adopt or host Sail itself** — compose the pieces yourself, deploy a shell, or check on a hosted version | [How to consume Sail](./how-to-consume) |
| **Contribute to or build Sail from source** | [Development Guide](./development) |

## Documentation policy

The **Docusaurus site** (`website/docs/`) is the single source of truth for all documentation. npm `README.md` files in each package are brief summaries that link here.
