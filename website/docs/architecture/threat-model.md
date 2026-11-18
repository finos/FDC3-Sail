---
sidebar_position: 5
---

# Threat model and security self-assessment

This page is FDC3 Sail's project-wide security assessment. It lists the most likely and most
damaging things that could go wrong, what already stops them, and what is still open. It meets
[OSPS Baseline](https://baseline.openssf.org/) control **OSPS-SA-03.01**, and is the project's
**assurance case** for the [OpenSSF Best Practices badge](https://www.bestpractices.dev/en/projects/12272):

| The assurance case needs… | Section |
|---|---|
| A threat model | [Ranked threats](#ranked-threats) |
| Clear trust boundaries | [System and trust boundaries](#system-and-trust-boundaries) |
| An argument that secure design principles are applied | [Secure design principles](#secure-design-principles) |
| An argument that common weaknesses are countered | [Common weaknesses](#common-weaknesses-owasp-top-10) |

| | |
|---|---|
| **Scope** | v3 browser host: `@finos/sail-browser-agent`, `@finos/sail-platform`, the `sail-finance` and `sail-one` example shells, and the release pipeline. The legacy v2 Socket.IO app is covered briefly. |
| **Method** | Trust boundaries from the [architecture overview](./overview), then STRIDE threats per boundary, rated by likelihood × impact. |
| **Last reviewed** | 2026-11-17, against `main` after `v3.0.0-beta.1` |
| **Review cadence** | Every major or minor release, and whenever a trust boundary changes. |

Status markers follow the [overview convention](./overview#status-markers): **`[implemented]`**
means the code does it today; **gap** means it does not.

## System and trust boundaries

```mermaid
flowchart LR
  subgraph USER["User's browser"]
    subgraph HOSTTAB["Host page origin (sail-finance / sail-one)"]
      DA["SailDesktopAgent"]
      PLAT["sail-platform<br/>workspace store"]
      LS[("localStorage")]
    end
    APP1["FDC3 app iframe<br/>(origin A)"]
    APP2["FDC3 app iframe<br/>(origin B)"]
  end
  URL(["Launch URL<br/>?fdc3Directory=…"])
  DIR[("App Directory<br/>(remote JSON)")]
  NPM[("npm registry<br/>@finos/*")]
  CI["GitHub Actions<br/>release.yml"]

  URL -- "TB1" --> HOSTTAB
  DIR -- "TB2 fetch" --> DA
  APP1 -- "TB3 WCP + DACP<br/>MessagePort" --> DA
  APP2 -- "TB3" --> DA
  PLAT <-- "TB4" --> LS
  CI -- "TB5 publish" --> NPM
  NPM -- "TB5 install" --> HOSTTAB
```

| Boundary | Crosses from → to | What crosses it |
|---|---|---|
| **TB1** | Whoever wrote the link → host page | Query parameters (`fdc3Directory`, `appId`, `noSplash`) |
| **TB2** | Directory server → agent | The list of apps allowed to connect |
| **TB3** | App iframe (any origin) → agent | WCP handshake, then DACP requests: broadcasts, intents, channel joins |
| **TB4** | Host origin's storage → workspace store | Saved workspaces, layouts, channel choices |
| **TB5** | Contributors and dependencies → published packages → integrators | Source, dependencies, npm tarballs |

**Assets worth protecting:** the context data apps share (often client or trading data), the
integrity of the app list (who is admitted), the host page itself (anything running there controls
the agent), and the integrity of the published `@finos/*` packages.

## Ranked threats

Ratings: **L**ow / **M**edium / **H**igh. Ranked by likelihood × impact, most serious first.

| # | Threat | STRIDE | Boundary | Likelihood | Impact | Status |
|---|---|---|---|---|---|---|
| T1 | Directory override via crafted launch link | Spoofing, Elevation | TB1, TB2 | M | H | **gap** |
| T2 | A malicious or compromised app in the directory reads shared context | Info disclosure | TB3 | M | H | partly mitigated |
| T3 | Compromised dependency or release | Tampering | TB5 | M | H | partly mitigated |
| T4 | Malformed DACP messages are processed by default | Tampering, DoS | TB3 | M | M | **gap** |
| T5 | Intent auto-resolves to an unintended app | Info disclosure | TB3 | M | M | by design; host can mitigate |
| T6 | Script injection on the host page | Elevation | host origin | L | H | partly mitigated |
| T7 | App impersonates another app's origin | Spoofing | TB3 | L | H | **`[implemented]`** mitigation |
| T8 | Tampered workspace in localStorage | Tampering | TB4 | L | M | partly mitigated |
| T9 | Legacy v2 Socket.IO server accepts any connection | Spoofing, DoS | v2 only | L | M | out of v3 scope |

### T1 — Directory override via crafted launch link

**What could happen.** Both example shells read `?fdc3Directory=` from the page URL and, when it is
present, use it *instead of* the configured directory (see the directory set-up in
`sail-finance/src/main.tsx` and `sail-one/src/index.tsx`).
The directory is the admission list (see [App admission](./security)), so anyone who can get a user
to click a link to a real Sail deployment can choose which apps that session admits. Attacker apps
then run inside a trusted-looking host, under its brand and URL.

**What stops it today.** A deployment's Content-Security-Policy `frame-src` still limits which
origins can be framed, so attacker apps on unlisted origins will not load. The override is not part
of `@finos/sail-browser-agent`; it is shell behaviour.

**Gap and recommendation.** Make the query override opt-in (off in production builds), or restrict it
to an allowlist of directory hosts. Integrators building their own host should not copy this pattern
without that guard.

### T2 — Malicious or compromised app in the directory

**What could happen.** Once admitted, an app can join user channels, receive every broadcast on them,
listen for intents and raise them. FDC3 has no per-app permission model, so an admitted app sees what
any other admitted app on the same channel sees. A legitimate app whose own site is compromised
behaves the same way.

**What stops it today.** `[implemented]` Only directory entries are admitted, and origins are checked
(T7). Context is only delivered to apps on the same channel or chosen as an intent target.

**Residual risk.** Accepted, and inherent to FDC3. Deployments must vet directory entries and serve
apps over HTTPS ([App admission — what a deployment should do](./security#what-a-deployment-should-do-instead)).

### T3 — Compromised dependency or release

**What could happen.** A malicious dependency update, a compromised GitHub Action, or a leaked npm
token puts hostile code into `@finos/sail-browser-agent` or `@finos/sail-platform`, which then runs
inside every integrator's host page.

**What stops it today.** `[implemented]`

- `@finos/sail-platform` has zero runtime dependencies; `@finos/sail-browser-agent` depends only on
  `@finos/fdc3` and `@finos/fdc3-schema`.
- PRs run GitHub Dependency Review (including a provenance-downgrade check), CodeQL, zizmor
  (workflow linting) and OSV-Scanner. OpenSSF Scorecard runs on `main`.
- Third-party Actions are pinned to commit SHAs.
- Publishing happens only from `release.yml` on `main`, through Changesets.
- The published packages set `publishConfig.provenance: true`, so releases carry an npm provenance
  attestation that integrators can check ([SECURITY.md — Verifying Releases](https://github.com/finos/FDC3-Sail/blob/main/SECURITY.md)).

**Gap and recommendation.** Publishing still uses a long-lived `NPM_TOKEN`. Move to npm trusted
publishing (OIDC — `id-token: write` is already granted) and delete the token.

### T4 — Malformed DACP messages processed by default

**What could happen.** Inbound DACP and WCP messages are checked against the FDC3 schema
(`app-connection/inbound-validation.ts`), but the default mode is `"warn"`: an invalid message is
logged and then handled anyway. A buggy or hostile app can send malformed requests that reach
handlers which assume valid shapes. The worst likely result is errors or a stuck agent in that tab
(denial of service), not cross-app access.

**What stops it today.** Handlers dispatch on known message types. Hosts can pass
`validation: "strict"` to reject invalid messages.

**Gap and recommendation.** Make `"strict"` the default once the conformance suite passes under it,
and add rate or size limits per connection.

### T5 — Intent auto-resolves to an unintended app

**What could happen.** If a host omits `intentResolver`, the agent picks the first handler for a
raised intent. The context payload goes to that app without the user choosing it. If T2 applies, the
payload goes to an attacker app.

**What stops it today.** Both example shells show a resolver UI so the user picks the target.
`sail-one` skips it when built with `VITE_AUTO_RESOLVE=1`, which is meant for tests only. The
default is documented in the [host-contract surface](./overview#host-contract-surface).

**Recommendation.** Integrators handling sensitive data should always supply an `intentResolver`.

### T6 — Script injection on the host page

**What could happen.** Any script running on the host origin controls the agent directly: it can read
all context, rewrite the app list and fake user choices.

**What stops it today.** The shells are React apps, which escape rendered text by default. Apps run in
iframes on their own origins, so a compromised app cannot reach the host page's DOM.

**Recommendation.** Deployments should set a strict Content-Security-Policy (`script-src`,
`frame-src`) on the host page, as already advised in [App admission](./security).

### T7 — App impersonates another app's origin

**What stops it.** `[implemented]` WCP4 identity validation requires `identityUrl`, `actualUrl` and the
`WCP1Hello` `MessageEvent.origin` to match, and the app to be in the directory. Both checks fail
closed. Details in [App admission](./security#what-the-desktop-agent-enforces-implemented).

**Residual risk.** Low. Origin identity is only meaningful over HTTPS.

### T8 — Tampered workspace in localStorage

**What could happen.** Saved workspaces live in the host origin's `localStorage` by default
(`sail-platform/src/storage/local.ts`). Anything that can write there (T6, or local access to the
machine) can change which apps a saved workspace reopens.

**What stops it today.** Launching still goes through the agent's directory, so a tampered workspace
cannot admit an app the directory does not list. The data is not encrypted and should not hold
secrets.

### T9 — Legacy v2 Socket.IO server

**What could happen.** `sail-v2-web` runs an Express + Socket.IO server that accepts any connection
without authentication (`src/server/da/initSailSocketIOService.ts`). If it is exposed beyond
localhost, anyone who can reach it can talk to the agent.

**Status.** Out of scope for the v3 browser host, which has no server. v2 is kept runnable for
comparison only and should not be deployed on a shared network.

## Secure design principles

How the classic [Saltzer and Schroeder](https://en.wikipedia.org/wiki/Saltzer_and_Schroeder%27s_design_principles)
principles show up in Sail, and where they don't yet.

| Principle | How Sail applies it | Where |
|---|---|---|
| **Fail-safe defaults** | An app is rejected unless its origins match *and* it is in the directory. Invalid directory entries are skipped, not trusted. Exception: inbound message validation defaults to `"warn"` (T4). | `app-connection/wcp/wcp-identity-validation.ts`, `app-directory/fetch-app-directory.ts` |
| **Least privilege** | Apps run in iframes on their own origins and can only reach the agent through their own `MessagePort`. CI workflows default to `contents: read`; only the release job can write. | `app-connection/wcp/wcp1-3-handshake.ts`, `.github/workflows/` |
| **Complete mediation** | Every app request goes through the agent over its port; apps never talk to each other directly. The handshake reply is posted to the caller's `event.origin`, not `"*"`. | `wcp1-3-handshake.ts` |
| **Economy of mechanism** | `@finos/sail-platform` has no runtime dependencies. `@finos/sail-browser-agent` depends only on FDC3 packages and `@finos/sail-headless-agent`. | `packages/*/package.json` |
| **Open design** | Source, this threat model and the admission rules are public. Nothing relies on a secret design. | This page, [App admission](./security) |
| **Separation of privilege** | Changes to `main` need a PR approved by a code owner other than the last pusher, plus passing `ci` and `dependency-review` checks. No bypass actors. | Repository ruleset, `.github/CODEOWNERS` |
| **Least common mechanism** | Each app gets its own `MessageChannel`. Workspace storage is scoped to the host origin. | `wcp1-3-handshake.ts`, `sail-platform/src/storage/` |
| **Psychological acceptability** | The example shells show an intent resolver so the user picks where data goes (T5). | `sail-one/src/embeddable-ui/intent-resolver.tsx` |
| **Defence in depth** | Admission is layered: directory membership, origin checks, and (deployment-side) CSP `frame-src` and HTTPS. | [App admission](./security) |

## Common weaknesses (OWASP Top 10)

Each [OWASP Top 10 (2025)](https://owasp.org/Top10/2025/) category, how Sail counters it, and what
checks it automatically. CodeQL runs the `security-extended` query suite, and every alert it raises
is tagged with a [CWE](https://cwe.mitre.org/) ID.

| OWASP category | How Sail counters it | Automated check |
|---|---|---|
| **A01 Broken access control** | WCP4 admission (directory + origin match). Context only reaches apps on the same channel or the chosen intent target. Open gap: T1. | CodeQL; conformance tests |
| **A02 Security misconfiguration** | Workflows use least-privilege permissions and pinned Actions. Host-page CSP and HTTPS are a deployment job, documented in [App admission](./security). | zizmor; Scorecard |
| **A03 Software supply chain failures** | Few runtime dependencies, SHA-pinned Actions, npm provenance, releases only from `release.yml`. | Dependency Review + provenance check; OSV-Scanner; Scorecard |
| **A04 Cryptographic failures** | Sail implements no cryptography of its own. Transport security comes from the browser's HTTPS. IDs use `crypto.randomUUID()`. | CodeQL (insecure randomness) |
| **A05 Injection (including XSS)** | The v3 packages have no server or database. UI is React, which escapes text; the v3 packages use no `dangerouslySetInnerHTML`, `innerHTML` or `eval`. | CodeQL (XSS, code injection, prototype pollution) |
| **A06 Insecure design** | This threat model, reviewed every minor/major release and when a trust boundary changes. | Review cadence (above) |
| **A07 Authentication failures** | Sail has no user accounts or login; user sign-in belongs to the deployment. App identity is origin-based (T7). | n/a |
| **A08 Software or data integrity failures** | npm provenance on releases. A tampered workspace cannot admit an app the directory does not list (T8). | Dependency Review + provenance check |
| **A09 Logging and alerting failures** | Invalid inbound messages and skipped directory entries are logged through the agent's logger. Central logging is a deployment job. | — |
| **A10 Mishandling of exceptional conditions** | Identity checks fail closed; bad directory entries are skipped. Open gap: malformed DACP messages are still handled in `"warn"` mode (T4). | CodeQL |

## Follow-up work

Tracked in [#485](https://github.com/finos/FDC3-Sail/issues/485).

| Threat | Action | Owner |
|---|---|---|
| T1 | Gate or allowlist `?fdc3Directory=` in the shells | maintainers |
| T3 | Switch to npm trusted publishing (OIDC) and delete `NPM_TOKEN` | maintainers |
| T4 | Default inbound validation to `"strict"` | maintainers |

Report suspected vulnerabilities privately, as described in [SECURITY.md](https://github.com/finos/FDC3-Sail/blob/main/SECURITY.md).

## Related

- [App admission and origin trust](./security) — the WCP4 checks in detail, and deployment advice.
- [Architecture overview](./overview) — packages, host contracts and the connection model.
- [`security-insights.yml`](https://github.com/finos/FDC3-Sail/blob/main/security-insights.yml) — links here as the project's self-assessment.
