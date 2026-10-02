# Conformance runs (Playwright)

Unattended FDC3 conformance no longer uses a `?suite=` headless patch or a
`Conformance1Headless` directory entry.

Playwright opens `/?appId=Conformance1`, selects suite **All**, wraps `mocha.run` to
observe the runner `end` event, clicks **Run**, and scrapes `#mocha` until that end
(or completed count === registered suite total). Matching only on “all visible
`li.test` nodes are terminal” is wrong — Mocha paints tests as they run, so mid-suite
gaps look finished. See [`e2e/conformance.spec.ts`](./e2e/conformance.spec.ts) and
[`e2e/mocha-scrape.ts`](./e2e/mocha-scrape.ts).

Toolbox static assets come from versioned aliases:

- `@robmoffat/fdc3-conformance-2.2` → FDC3 2.2
- `@robmoffat/fdc3-conformance-3.0` → FDC3 3.0

Set `CONFORMANCE_FDC3_VERSION=2.2|3.0` (Vite `publicDir` + agent target). CI runs both
in a matrix via `.github/workflows/conformance.yml`.
