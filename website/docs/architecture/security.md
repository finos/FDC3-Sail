---
sidebar_position: 3
---

# App admission and origin trust

An FDC3 host decides which browsing contexts may become apps. This page states what Sail enforces
today, what it deliberately does not, and where a deployment has to make its own arrangements.

## What the Desktop Agent enforces `[implemented]`

Admission happens during **WCP4 identity validation**, in `@finos/sail-desktop-agent`
(`app-connection/wcp/wcp-identity-validation.ts`). Two checks run, both required by the FDC3
standard, and both fail closed:

**1. Origin consistency.** The origins of `identityUrl`, `actualUrl`, and the `WCP1Hello`
`MessageEvent.origin` must all match. A mismatch — or a missing `WCP1Hello` origin — is rejected
with `WCP5ValidateAppIdentityFailedResponse`. An app cannot claim to be served from one origin while
connecting from another.

**2. App Directory membership.** The connecting app must resolve to an entry in the agent's app
directory (`wcp-identity-validation.ts:115`). An app the directory has never heard of is rejected.

This second check is the load-bearing one for deployment control: **the directory the agent is given
is the set of apps that may connect**. A host that assembles that directory per user has already
expressed an admission policy, without any additional API.

## What Sail does not ship

There is **no origin allowlist** in the product today. An earlier `allowedOrigins` option existed on
a `sail-platform` factory that has since been removed; it was never set by any shell, so the check
never ran in a running deployment.

If it returns, a reimplementation must fail closed, and must reconstruct `connectionAttemptUuid`
from the `temp-` instance id during early handshake, or it will fail to reply to exactly the
connections it is meant to reject.

If it returns, it belongs in `@finos/sail-desktop-agent` as agent configuration, beside the WCP4
check above — not in a wrapper package that cannot see the wire. `@finos/sail-platform` holds
workspaces, layouts and storage, and has no dependency on the agent at all.

## What a deployment should do instead

Restricting which origins may connect is, today, a job for the layers around the agent:

- **Curate the app directory.** It is the admission list. Vet entries, and serve a per-user
  projection of it if different users should see different apps.
- **Set a Content-Security-Policy** on the host page — `frame-src` bounds which origins can be
  framed at all, before WCP1 is ever sent.
- **Serve over HTTPS**, so origin identity means something.

None of these are substitutes for each other, and none are substitutes for reviewing what you put in
the directory.

## Related

- [@finos/sail-desktop-agent](../packages/desktop-agent/overview) — where admission is enforced.
- [Desktop Agent integrator guide](../packages/desktop-agent/integrator-guide) — supplying the app
  directory a host admits from.
- [@finos/sail-platform](../packages/platform/overview) — workspaces, layouts and storage; no FDC3,
  no admission role.
