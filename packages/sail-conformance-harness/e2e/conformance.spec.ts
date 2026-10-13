import { expect, test, type ConsoleMessage, type Page } from "@playwright/test"
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { checkRun, loadExpectedTests, summariseResult } from "./conformance-result"
import { resolveConformanceHostId } from "./hosts"
import { awaitMochaResult, installMochaEndHook } from "./mocha-scrape"
import { resolveConformanceFdc3Version, TOOLBOX_DIRECTORY_URL } from "./toolbox"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")
const fdc3Version = resolveConformanceFdc3Version()
const hostId = resolveConformanceHostId()
const cell = `${hostId}-${fdc3Version}`

/** The toolbox always serves the conformance app under `/apps/app/index.html`. */
const CONFORMANCE_IFRAME = 'iframe[src*="/apps/app/index.html"]'

/** Set by the hosts' `?appId=` deep link once the open settles. */
type HostWindowFlags = {
  __sailConformanceOpenError?: string
  __sailConformanceReady?: string
}

async function dumpHostDiagnostics(page: Page, consoleLines: string[]): Promise<string> {
  const flags = await page
    .evaluate(() => window as unknown as HostWindowFlags)
    .then(w => ({ ready: w.__sailConformanceReady, openError: w.__sailConformanceOpenError }))
    .catch(() => ({ ready: undefined, openError: undefined }))
  const iframeSrcs = await page
    .locator("iframe")
    .evaluateAll(els => els.map(el => (el as HTMLIFrameElement).src || "(no src)"))
    .catch(() => [] as string[])

  return [
    `cell=${cell}`,
    `ready=${flags.ready ?? "(unset)"}`,
    `openError=${flags.openError ?? "(none)"}`,
    `iframeSrcs=${JSON.stringify(iframeSrcs)}`,
    `consoleTail:\n${consoleLines.slice(-40).join("\n")}`,
  ].join("\n")
}

const consoleLines: string[] = []

test.afterEach(() => {
  // The host page's whole console, for diagnosing a failed cell.
  writeFileSync(join(ARTIFACTS, `console-${cell}.log`), `${consoleLines.join("\n")}\n`)
})

test(`FDC3 ${fdc3Version} conformance on ${hostId}`, async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  page.on("console", (msg: ConsoleMessage) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`)
  })

  // The directory also rides in the query, so a host that misses the Vite env still loads only it.
  const deepLink = new URLSearchParams({
    appId: "Conformance1",
    fdc3Directory: TOOLBOX_DIRECTORY_URL,
  })
  await page.goto(`/?${deepLink.toString()}`)

  const openError = await page
    .waitForFunction(
      () => {
        const w = window as unknown as HostWindowFlags
        return w.__sailConformanceOpenError ?? (w.__sailConformanceReady ? "" : undefined)
      },
      undefined,
      { timeout: 90_000 },
    )
    .then(handle => handle.jsonValue())
    .catch(() => "")
  if (openError) {
    await page.screenshot({ path: join(ARTIFACTS, `open-error-${cell}.png`), fullPage: true })
    throw new Error(`Host deep-link open failed: ${openError}`)
  }

  const iframe = page.locator(CONFORMANCE_IFRAME)
  try {
    await iframe.waitFor({ state: "attached", timeout: 120_000 })
  } catch (error: unknown) {
    await page.screenshot({ path: join(ARTIFACTS, `iframe-timeout-${cell}.png`), fullPage: true })
    const diagnostics = await dumpHostDiagnostics(page, consoleLines)
    writeFileSync(join(ARTIFACTS, `iframe-timeout-${cell}.txt`), `${diagnostics}\n`)
    throw new Error(
      `Timed out waiting for the Conformance1 iframe.\n${diagnostics}\nOriginal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  const frame = page.frameLocator(CONFORMANCE_IFRAME)
  await frame.locator("#testSuite option").first().waitFor({ state: "attached", timeout: 120_000 })
  await frame.locator("#testSuite").selectOption({ label: "All" })

  const mochaFrame = page.frames().find(f => f.url().includes("/apps/app/index.html"))
  if (!mochaFrame) {
    throw new Error("Conformance iframe not found before Run")
  }
  expect(await installMochaEndHook(mochaFrame), "mocha.run end hook installed").toBe(true)

  await frame.locator("#runButton").click()

  const outcome = await awaitMochaResult(page).catch(async (error: unknown) => {
    await page.screenshot({ path: join(ARTIFACTS, `timeout-${cell}.png`), fullPage: true })
    throw error
  })

  writeFileSync(
    join(ARTIFACTS, `conformance-${cell}.json`),
    `${JSON.stringify({ host: hostId, fdc3Version, ...outcome }, null, 2)}\n`,
  )

  // #mocha is a long list inside a fixed-height iframe; grow the iframe so every row paints.
  await page
    .evaluate(selector => {
      const el = document.querySelector<HTMLIFrameElement>(selector)
      const height = el?.contentDocument?.documentElement.scrollHeight
      if (el && height) {
        el.style.height = `${height}px`
      }
    }, CONFORMANCE_IFRAME)
    .catch(() => undefined)
  await frame
    .locator("#mocha")
    .screenshot({ path: join(ARTIFACTS, `conformance-${cell}.png`) })
    .catch(() => undefined)

  const summary = `${hostId} FDC3 ${fdc3Version}: ${summariseResult(outcome)}`
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**${summary}**\n`)
  }

  expect(checkRun(outcome, loadExpectedTests(fdc3Version)).join("\n")).toBe("")
})
