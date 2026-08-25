# Running the FDC3 Conformance Suite Headlessly

The conformance app normally waits for someone to pick a suite from a drop-down
and click **Run**. Headless mode makes it start itself and announce the result,
so a desktop agent, a Playwright spec, or a CI job can run it unattended.

Nothing changes unless you pass a `?suite=` query parameter. Without it the app
behaves exactly as it always has.

---

## 1. What you copy

Build the suite and copy the whole `dist/` folder to wherever you want to serve
it from:

```sh
npm install
npm run build      # -> dist/
```

`dist/` is completely self-contained and static. Serve it on any HTTP server:

```sh
npm run serve      # http-server ./dist -p 3001 -c-1
```

That gives you:

| URL                                                        | What it is                        |
| ---------------------------------------------------------- | --------------------------------- |
| `http://localhost:3001/apps/app/index.html`                | the conformance app (interactive) |
| `http://localhost:3001/apps/app/index.html?suite=All`      | the conformance app (headless)    |
| `http://localhost:3001/apps/*/index.html`                  | the 16 mock apps the tests drive  |
| `http://localhost:3001/directories/local-conformance.json` | **the app directory endpoint**    |

> The port matters. `directories/local-conformance.json` has `http://localhost:3001`
> baked into every URL. If you serve on a different host or port, search and
> replace that string throughout the file.

---

## 2. Point your desktop agent at the app directory

Register `http://localhost:3001/directories/local-conformance.json` as an AppD v2
directory in your desktop agent. It contains 18 applications:

- `Conformance1` — the conformance app, interactive
- `Conformance1Headless` — the same app at `?suite=All&delay=1000`, auto-runs
- 16 mock apps (`IntentAppAId` … `IntentAppKId`, `OpenAppAId`, `OpenAppBId`, `ChannelsAppId`, `MockAppId`, `MetadataAppId`)

**The mock apps are not optional.** The tests call `fdc3.open` and
`fdc3.raiseIntent` against them by appId, so the agent has to be able to launch
every one of them. Missing entries show up as test failures, not as errors.

### A note on `IntentAppLId`

Some copies of this app directory in the wild contain an `IntentAppLId` entry
pointing at `apps/intent-l/index.html`. **That path does not exist in this
build** — it would 404. The `LTestingIntent` listener actually lives in
`apps/basic/index.html`, and no test in 2.2.3 uses it. The generated
`local-conformance.json` omits the entry. If you are maintaining your own copy
of the directory, drop it.

---

## 3. URL parameters

| Parameter      | Default | Effect                                                                                                                                                                                |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suite`        | —       | Runs a pack unattended. `All`, or any single test from the drop-down (`fdc3.open`, `fdc3.raiseIntent`, `fdc3.basicCL1`, …). Presence of this parameter is what enables headless mode. |
| `manual`       | —       | Runs one of the manual tests instead. **Needs a human** at the intent resolver — never use this in CI.                                                                                |
| `delay`        | `0`     | Milliseconds to wait after the agent is ready before starting. Useful if your agent needs a moment to finish registering apps. `1000` is a safe default.                              |
| `agentTimeout` | `30000` | If `getAgent()` has not resolved within this many milliseconds, the app gives up and emits a terminal `error` result instead of hanging forever.                                      |

Bad input always fails fast with a terminal `error` result rather than hanging:

- an unknown `suite` or `manual` name reports the full list of valid names
- `delay` and `agentTimeout` must be non-negative numbers. Anything else — a
  non-numeric value, a negative one, or an **empty** `?agentTimeout=` left behind
  by a broken template — is rejected rather than being silently coerced to `0`
- anything that throws while starting up (missing markup, agent discovery
  blowing up) is caught and reported on all four channels

A headless run that dies without emitting a terminal result is a silent CI hang,
so there is no code path between "headless mode requested" and "result emitted"
that can escape without signalling.

---

## 4. How completion is signalled

When the run finishes, the app publishes the same payload on four independent
channels. Pick whichever suits your runner — you do not have to configure
anything to turn them on.

| #   | Channel                                                                | How you consume it                                                   |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | `window.__FDC3_CONFORMANCE__` and `<body data-conformance="complete">` | `page.waitForFunction` (same-origin only)                            |
| 2   | A single `console.log` line prefixed `FDC3_CONFORMANCE_RESULT`         | `page.on('console')` — works across origins, scrapeable from CI logs |
| 3   | `postMessage` to `window.parent` and `window.opener`                   | a `message` listener in the desktop agent hosting the iframe         |
| 4   | An FDC3 broadcast on app channel `fdc3-conformance-results`            | a collector app registered in the app directory                      |

`data-conformance` moves through `starting` → `running` → `complete` (or
`error`), so you can also tell a run that never started from one still in flight.

Progress is also emitted per test on a `FDC3_CONFORMANCE_STATUS` console line
carrying `{status:'running', completed, total}` — useful for a live CI log, and
for detecting a run that has stalled rather than one that never began.

### Result payload

```jsonc
{
  "status": "complete", // "complete" | "error" | "running"
  "suite": "All",
  "passes": 96,
  "failures": 2,
  "pending": 0,
  "total": 98,
  "durationMs": 184213,
  "startedAt": "2026-08-14T09:12:03.111Z",
  "finishedAt": "2026-08-14T09:15:07.324Z",
  "userAgent": "Mozilla/5.0 ...",
  "tests": [
    {
      "title": "fdc3.open (2.0) Can open app by appId",
      "suite": "fdc3.open",
      "state": "passed", // "passed" | "failed" | "pending"
      "durationMs": 412,
    },
    {
      "title": "fdc3.raiseIntent (2.0) Returns an IntentResolution",
      "suite": "fdc3.raiseIntent",
      "state": "failed",
      "durationMs": 20001,
      "error": "Timed out waiting for intent listener",
      "stack": "AssertionError: ...\n    at ...", // truncated to 2000 chars
    },
  ],
}
```

An `error` result is `{ status, suite, error, stack }` with no test array — that
means the run never got going (agent never resolved, unknown suite name).

The relevant constants are exported from `src/test/headlessSignal.ts` if you want
to import them rather than hard-code the strings:
`RESULT_SENTINEL`, `STATUS_SENTINEL`, `RESULT_CHANNEL_ID`, `RESULT_CONTEXT_TYPE`.

---

## 5. Driving it with Playwright

This is the recommended route for a browser-based or Electron desktop agent.
The spec below waits on the **console sentinel**, which is the only channel that
works regardless of whether the conformance app ends up same-origin with your
agent's shell.

### `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // the whole suite is slow: TestTimeout is 20s per test, NoListenerTimeout is 120s
  timeout: 15 * 60_000,
  expect: { timeout: 30_000 },
  workers: 1, // the suite opens real windows; do not parallelise
  reporter: [['list'], ['junit', { outputFile: 'artifacts/conformance-junit.xml' }]],
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1400, height: 1000 },
  },
  webServer: [
    {
      // serves dist/ - the conformance app, the mock apps and the app directory
      command: 'npx http-server ./path/to/fdc3-conformance/dist -p 3001 -c-1',
      url: 'http://localhost:3001/directories/local-conformance.json',
      reuseExistingServer: !process.env.CI,
    },
    // TODO(desktop agent): add a second entry that boots your agent,
    // configured against http://localhost:3001/directories/local-conformance.json
  ],
});
```

### `e2e/conformance.spec.ts`

```ts
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const RESULT_SENTINEL = 'FDC3_CONFORMANCE_RESULT';
const STATUS_SENTINEL = 'FDC3_CONFORMANCE_STATUS';

type ConformanceResult = {
  status: 'complete' | 'error';
  suite: string;
  passes?: number;
  failures?: number;
  total?: number;
  error?: string;
  tests?: { title: string; state: string; error?: string }[];
};

/**
 * Resolves with the conformance result the moment any page in the context
 * prints the sentinel - including pages the desktop agent opens itself.
 */
function awaitResult(page: Page): Promise<ConformanceResult> {
  return new Promise(resolve => {
    const onConsole = (msg: { text(): string }) => {
      const text = msg.text();
      if (text.startsWith(RESULT_SENTINEL)) {
        resolve(JSON.parse(text.slice(RESULT_SENTINEL.length + 1)));
      } else if (text.startsWith(STATUS_SENTINEL)) {
        const { completed, total } = JSON.parse(text.slice(STATUS_SENTINEL.length + 1));
        process.stdout.write(`\r  conformance ${completed}/${total}   `);
      }
    };
    page.on('console', onConsole);
    page.context().on('page', p => p.on('console', onConsole));
  });
}

test('FDC3 2.2 conformance', async ({ page }) => {
  mkdirSync('artifacts', { recursive: true });
  const result = awaitResult(page);

  // TODO(desktop agent): replace with however your agent boots and launches an
  // app. The three shapes that normally work:
  //   a) the agent's own URL with a launch parameter:
  //        await page.goto('http://localhost:8080/?appId=Conformance1Headless');
  //   b) boot the agent, then drive its launcher UI:
  //        await page.goto('http://localhost:8080/');
  //        await page.getByRole('button', { name: 'Conformance1Headless' }).click();
  //   c) Electron:
  //        const app = await _electron.launch({ args: ['.'] });
  //        const page = await app.firstWindow();
  await page.goto('http://localhost:8080/?appId=Conformance1Headless');

  const outcome = await result;
  writeFileSync('artifacts/conformance.json', JSON.stringify(outcome, null, 2));

  // screenshot the results list, not the viewport - #mocha is a long scrolling
  // list and a viewport screenshot only captures the tail
  const frame = page.frameLocator('iframe[src*="/apps/app/index.html"]');
  await frame.locator('#mocha').screenshot({ path: 'artifacts/conformance.png' });
  await page.screenshot({ path: 'artifacts/conformance-full.png', fullPage: true });

  expect(outcome.status, outcome.error ?? '').toBe('complete');
  const failed = (outcome.tests ?? []).filter(t => t.state === 'failed');
  expect(failed.map(t => `${t.title}: ${t.error}`).join('\n')).toBe('');
});
```

### If the conformance app is same-origin

You can wait on the DOM flag instead, which also guarantees the results list has
rendered before you screenshot:

```ts
await page.waitForFunction(() => document.body.dataset.conformance === 'complete', null, {
  timeout: 15 * 60_000,
});
const result = await page.evaluate(() => window.__FDC3_CONFORMANCE__);
```

### Screenshot on timeout too

A hung agent is the case you most want a picture of. Wrap the wait:

```ts
const outcome = await Promise.race([
  result,
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('conformance timed out')), 13 * 60_000)),
]).catch(async err => {
  await page.screenshot({ path: 'artifacts/conformance-timeout.png', fullPage: true });
  throw err;
});
```

---

## 6. Driving it with an FDC3 listener

If your agent is not something Playwright can attach to, register a collector
app in the same app directory and let the conformance app broadcast to it.

```ts
import { getAgent } from '@finos/fdc3';

const agent = await getAgent();
const channel = await agent.getOrCreateChannel('fdc3-conformance-results');

await channel.addContextListener('fdc3.conformance.result', ctx => {
  const result = (ctx as any).result;
  document.body.dataset.conformance = result.status;
  console.log(`FDC3_CONFORMANCE_RESULT ${JSON.stringify(result)}`);
  // or POST it to a local results server your CI job is polling
});
```

Add the collector to `local-conformance.json` as an ordinary web app, and have
your CI job launch it before `Conformance1Headless`.

**Use this as a second signal, not your only one.** The broadcast travels
through the agent under test — if the agent is broken enough to fail
conformance, the completion notice can go missing on exactly the runs you most
want to catch. The console sentinel has no such dependency.

---

## 7. If the desktop agent hosts the app in an iframe

Listen for the `postMessage`:

```ts
window.addEventListener('message', event => {
  if (event.data?.type === 'FDC3_CONFORMANCE_RESULT') {
    const result = event.data.result;
    // render a verdict, close the frame, forward to a node bridge, ...
  }
});
```

`event.origin` will be your conformance host (`http://localhost:3001`) — check
it before trusting the payload if the agent loads third-party content.

---

## 8. Troubleshooting

| Symptom                                            | Cause                                                                                                          | Fix                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Nothing happens, `data-conformance` never set      | `?suite=` missing, or the app was launched from the `Conformance1` entry rather than `Conformance1Headless`    | Check the URL the agent actually loaded                                 |
| `status: "error"`, `getAgent() did not resolve`    | The agent never injected/answered the FDC3 handshake                                                           | Raise `agentTimeout`, or fix agent discovery for that window            |
| `status: "error"`, `Unknown suite`                 | Typo in `?suite=`                                                                                              | The message lists every valid name                                      |
| `status: "error"`, `must be non-negative numbers`  | `?delay=` or `?agentTimeout=` empty or non-numeric, usually an unsubstituted template variable in the appD URL | Fix the URL, or drop the parameter to take its default                  |
| Many failures mentioning open/raiseIntent timeouts | Mock apps missing from the app directory, or the agent blocks `window.open`                                    | Confirm all 16 mock appIds resolve and launch by hand first             |
| Run appears to hang, no `STATUS` lines             | Failure before the first test — usually app directory not loaded                                               | Screenshot on timeout; check the agent's console                        |
| Run hangs with `STATUS` lines still arriving       | A single test waiting on `NoListenerTimeout` (120s)                                                            | Normal; be patient, or raise the Playwright timeout                     |
| Screenshot shows only the last few tests           | Screenshotting the viewport rather than `#mocha`                                                               | `locator('#mocha').screenshot(...)` captures the full height            |
| Suite never finishes, drop-down still visible      | `?manual=` was used                                                                                            | Manual tests need a human at the intent resolver — never run them in CI |

---

## 9. What changed in this repo

| File                                        | Change                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/test/headlessSignal.ts`                | New. Result types and the four signal emitters.                                                                               |
| `src/test/index.ts`                         | New `headlessBootstrap()` reading the URL parameters. The interactive path is untouched.                                      |
| `src/test/testSuite.ts`                     | `executeTestsInBrowser` / `executeManualTestsInBrowser` now take an optional `onRunner` callback and return the Mocha runner. |
| `static/directories/local-conformance.json` | New. `website-conformance.json` rebased to `http://localhost:3001`, plus the `Conformance1Headless` entry.                    |

To regenerate the local app directory against a different host or port, edit the
URLs in `static/directories/local-conformance.json` directly — it is a plain
rebase of `website-conformance.json` with one extra entry.
