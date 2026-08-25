---
sidebar_position: 4
---

# FDC3 conformance traceability

This page maps FDC3 conformance surface to two distinct signals, and is careful not to conflate
them:

1. **Cucumber BDD scenarios** under `packages/sail-desktop-agent/test/features/` — fast,
   `MockTransport`-based tests of `SailDesktopAgent` behavior, tagged by FDC3 version
   (`@fdc3_2.0`, `@fdc3_2.2`, `@fdc3_3.0`). This is what most of this page documents, and it is
   **generated from the feature files themselves** (see below) so it cannot drift the way a
   hand-maintained inventory did.
2. **The FINOS FDC3 conformance toolbox**, run live in a browser against
   `@finos/sail-conformance-harness` — a different, browser/WCP-integrated signal with its own
   pass/fail exports. See [@finos/sail-conformance-harness](../conformance-harness/overview) for
   how that harness is wired, and [Conformance baseline status](#conformance-baseline-status)
   below for why this page does not currently state a pass rate.

For how `@finos/sail-desktop-agent` fits into the rest of the stack, see the
[architecture overview](../../architecture/overview) — this page does not restate that.

## Generated tag inventory

{/* GENERATED:CONFORMANCE-INVENTORY:START */}

_This section is generated from `packages/sail-desktop-agent/test/features/` — do not hand-edit between the markers. Regenerate with `npm run conformance:inventory --workspace=@finos/sail-docs` (see `website/scripts/generate-conformance-inventory.mjs`)._

**17 feature files** under `test/features/` today: **2** carry `@fdc3_2.2` (the 2.2 pack, 12 scenarios), and **8** more are `@fdc3_3.0`-only (11 scenarios) — the 3.0 profile runs both, **23** scenarios total. `@fdc3_2.0` is a scenario-level tag inside the 2.2 files marking scenarios also valid under FDC3 2.0 (**119** scenarios across **10** files).

#### `@fdc3_2.2` feature files

| Feature file | `@fdc3_2.2` scenarios | of which `@fdc3_2.0` |
| --- | --- | --- |
| `test/features/channels/private-channel.feature` | 4 | 9 |
| `test/features/context/event-listeners.feature` | 8 | — |

**Total: 12 scenarios across 2 files.**

#### `@fdc3_3.0`-only feature files (no `@fdc3_2.2` tag)

| Feature file | `@fdc3_3.0` scenarios |
| --- | --- |
| `test/features/apps/close.feature` | 2 |
| `test/features/context/context-metadata.feature` | 2 |
| `test/features/intents/intent-context-metadata.feature` | 2 |
| `test/features/intents/intent-listener-conflict.feature` | 7 |
| `test/features/intents/intent-metadata-performance.feature` | 2 |
| `test/features/intents/intent-result-metadata.feature` | 3 |
| `test/features/intents/intent-result.feature` | 4 |
| `test/features/intents/raise-intent.feature` | 1 |

**Total: 11 scenarios across 8 files.**

#### Run by profile (`packages/sail-desktop-agent/cucumber.yml`)

```bash
cd packages/sail-desktop-agent
npx cucumber-js --profile fdc3-2.2   # 12 scenarios
npx cucumber-js --profile fdc3-3.0   # 23 scenarios
npx cucumber-js --profile fdc3-2.0   # 119 scenarios
```

{/* GENERATED:CONFORMANCE-INVENTORY:END */}

## What the FDC3-version tags mean

- **`@fdc3_2.2`** — the current FDC3 2.2 conformance pack surface: user/app/private channels,
  broadcast, event listeners, intents (raise, raise-for-context, find, result), apps (metadata,
  open, findInstances), and disconnect/cleanup behavior.
- **`@fdc3_3.0`** — every `@fdc3_2.2` scenario (3.0 is a superset for this surface) **plus**
  scenarios that only make sense under 3.0: `fdc3.close`, `ContextMetadata`/`traceId` on
  broadcast and intent events, intent-listener-conflict detection, intent-result metadata
  (`getResultMetadata`), and two performance-budget guards. These live in their own feature
  files (listed below) and carry no `@fdc3_2.2` tag, because the behavior they assert
  (e.g. `IntentListenerConflict`) does not exist in the 2.2 API.
- **`@fdc3_2.0`** — a scenario-level tag *inside* the `@fdc3_2.2` files, marking the subset of
  scenarios whose asserted behavior is also valid under the older FDC3 2.0 API shape (no
  `ContextMetadata`, no `MalformedContext` guards on every path, etc.). It is not a separate
  feature-file set — it is a same-file, same-scenario overlay.

Each version has a matching `cucumber.yml` profile (`fdc3-2.0`, `fdc3-2.2`, `fdc3-3.0`) that
filters by tag; the generated section above lists the exact scenario counts each profile runs
today.

## Conformance area traceability (Cucumber BDD)

Status is honest: **covered** means representative `@fdc3_2.2` scenarios exist and pass in CI;
**partial** means real gaps remain (most commonly: the Cucumber suite uses `MockTransport`, so it
cannot exercise the live-browser WCP path the toolbox does); **missing** means no BDD coverage at
all; **n/a** means outside the FDC3 conformance pack's public-API surface.

| Conformance area | Feature file | Status | Notes |
|---|---|---|---|
| `getInfo` / implementation metadata | `apps/apps.feature` | partial | Core metadata assertions covered by Cucumber; the live-toolbox path is a separate, unmeasured signal — see [Conformance baseline status](#conformance-baseline-status) |
| User channels (list, join, leave, current, `displayMetadata`) | `channels/user-channels.feature` | covered | MockTransport coverage of API behavior |
| App channels (create, broadcast, listeners) | `channels/app-channels.feature` | covered | MockTransport coverage of API behavior |
| Private channels | `channels/private-channel.feature` | covered | Includes `AccessDenied` grant checks |
| Context broadcast (user channel) | `context/broadcast.feature` | covered | Includes `MalformedContext` and no-op-when-not-joined paths |
| `ContextMetadata` on broadcast (`fdc3.contextMetadata`) | `context/broadcast.feature`, `context/context-metadata.feature` (`@fdc3_3.0`) | covered | `context-metadata.feature` also asserts app-provided `traceId` propagation, a 3.0-only behavior |
| Context / event listeners | `context/event-listeners.feature` | covered | Includes `channelChanged`, null-type "listen to everything", and error paths for unsupported event types |
| `raiseIntent` | `intents/raise-intent.feature` | covered | Auto-resolve, resolver UI, cancellation, and `MalformedContext` paths |
| `ContextMetadata` on intent (`fdc3.intentContextMetadata`) | `intents/raise-intent.feature`, `intents/intent-context-metadata.feature` (`@fdc3_3.0`) | covered | 3.0-only file also asserts `traceId` propagation |
| `raiseIntentForContext` | `intents/raise-intent-with-context.feature` | covered | Running/non-running app targeting, resolver UI, `MalformedContext` |
| `findIntent` / `findIntentByContext` | `intents/find-intent.feature` | covered | Includes result-type/channel filters and `NoAppsFound` paths |
| Intent resolution / `IntentResolution.getResult()` | `intents/intent-result.feature` | covered | Includes `NoResultReturned` and `IntentHandlerRejected` rejection paths |
| Intent listener conflict (`IntentListenerConflict`) | `intents/intent-listener-conflict.feature` (`@fdc3_3.0` only) | covered | 3.0-only — the 2.2 API has no conflict detection to test |
| Intent result metadata (`getResultMetadata`) | `intents/intent-result-metadata.feature` (`@fdc3_3.0` only) | covered | 3.0-only — covers void, context, and `ContextWithMetadata` result shapes |
| `fdc3.close` | `apps/close.feature` (`@fdc3_3.0` only) | covered | Success path and `ErrorOnClose` |
| Apps (metadata, open, open with context, `findInstances`) | `apps/apps.feature` | covered | Includes `ErrorOnLaunch` and `MalformedContext` paths |
| Disconnect / lifecycle cleanup | `apps/disconnect-cleanup.feature` | covered | Broadcast and intent-result state cleanup on reconnect |
| FDC3 3.0 metadata performance guards | `intents/intent-metadata-performance.feature` (`@fdc3_3.0` + `@performance`) | covered | Budget assertions, not correctness assertions — a different kind of check from the rows above |
| WCP browser app connection | — | missing | Cucumber uses `MockTransport`; there is no `@fdc3_2.2`/`@fdc3_3.0` scenario that exercises the real WCP/`postMessage` path. This is exactly the gap the toolbox (browser-based) covers instead |
| Heartbeat / liveness | — | n/a | Sail transport hygiene (WCP6), not part of the FDC3 conformance pack's public API surface. No dedicated feature file exists today |

## Toolbox local dev (`toolbox-local` / `VITE_CONFORMANCE_TOOLBOX`) **`[implemented]`**

Running the FINOS toolbox against a **local** copy (instead of the hosted
`https://fdc3.finos.org/toolbox/fdc3-conformance`) is a supported dev mode, controlled by the
`VITE_CONFORMANCE_TOOLBOX` Vite env var:

| Profile | Env | Toolbox origin | FDC3 target |
|---|---|---|---|
| Hosted (default) | — | `https://fdc3.finos.org/toolbox/fdc3-conformance` | 3.0 |
| Local FINOS dev | `VITE_CONFORMANCE_TOOLBOX=local` | `http://localhost:3001` | 2.2 |

Two workspaces read this variable, each via its own `.env.toolbox-local` and a `dev:local` npm
script that passes Vite's `--mode toolbox-local`:

- **`@finos/sail-conformance-harness`** — `npm run dev:local -w @finos/sail-conformance-harness`
  runs the harness itself against the local toolbox on port 3001. See
  [@finos/sail-conformance-harness](../conformance-harness/overview).
- **`@finos/sail-finance`** — `npm run dev:local -w @finos/sail-finance` passes the same
  `--mode toolbox-local` through to that package's Vite dev server (`predev` builds the agent
  and platform first).

`sail-finance` always loads the same conformance app-directory fixture and merges it into its own
app directory alongside the public FINOS app directory (`https://directory.fdc3.finos.org/v2/apps`)
— that merge is unconditional, in every dev mode. What `VITE_CONFORMANCE_TOOLBOX=local` changes is
only the **origin** those conformance apps resolve to: hosted FINOS URLs by default, rewritten to
`sail-finance`'s own origin (so they load same-origin, which `window.name` / WCP4 host-instance
adoption requires) when the local profile is active. The harness does the same origin rewrite
against its own origin instead. Vite proxies `/apps`, `/lib`, and a couple of static assets to the
hosted FINOS toolbox so the rewritten URLs still resolve when running locally.

## Conformance baseline status

**83 of 83 passing, against an empty baseline.**

`@finos/sail-conformance-harness` runs the FINOS toolbox in a real browser under Playwright:

```bash
npm run test:conformance -w @finos/sail-conformance-harness
```

A run takes roughly five minutes and covers 21 suites. Results are compared against
`e2e/conformance-baseline-2.2.json`, which lists tests that are *allowed* to fail. **That list
is currently empty**, so every one of the 83 tests must pass or the run fails. There is no tolerated
failure to hide a regression behind.

The three titles that used to sit in that baseline were not toolbox flakiness — they were two real
defects in Sail: concurrent same-appId launches losing an instance registration, and a plain
`fdc3.open()` resolving before the launched app had connected. Both are fixed, which is why the list
is empty. Adding an entry back suppresses a real regression; fix the defect instead.

### Nightly CI

`.github/workflows/conformance.yml` runs the suite nightly at **03:00 UTC**, and on demand via
**`workflow_dispatch`** from the Actions tab. It gates on regressions against the baseline and
uploads its artifacts either way.

:::note
GitHub only fires scheduled workflows from a repository's **default branch**. On any other branch
the nightly run does not start until the branch merges — use `workflow_dispatch` in the meantime.
:::

## Related

- [@finos/sail-conformance-harness](../conformance-harness/overview) — the browser host the
  live FINOS toolbox runs against.
- [Composition & internals](./composition) — module ownership inside
  `@finos/sail-desktop-agent`.
- [Integrator guide](./integrator-guide) — the host-contract surface these scenarios exercise.
