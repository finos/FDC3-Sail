# Conformance runs (Playwright)

Unattended FDC3 2.2 conformance no longer uses a `?suite=` headless patch or a
`Conformance1Headless` directory entry.

Playwright opens `/?appId=Conformance1`, selects suite **All**, clicks **Run**, and
scrapes `#mocha` until the HTML reporter shows a finished result. See
[`e2e/conformance.spec.ts`](./e2e/conformance.spec.ts) and
[`e2e/mocha-scrape.ts`](./e2e/mocha-scrape.ts).

The toolbox static assets come from `@robmoffat/fdc3-conformance` (Vite `publicDir`).
