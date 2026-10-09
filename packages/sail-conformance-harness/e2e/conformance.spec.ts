import { expect, test, type ConsoleMessage, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  formatFailureReport,
  resolveConformanceFdc3Version,
  summariseResult,
} from "./conformance-result"
import { resolveConformanceHostId } from "./hosts"
import { awaitMochaResult, installMochaEndHook } from "./mocha-scrape"

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ARTIFACTS = join(PACKAGE_ROOT, "artifacts")
const fdc3Version = resolveConformanceFdc3Version()
const hostId = resolveConformanceHostId()

/**
 * Conformance1 iframe selectors differ slightly by host URL rewriting, but the
 * toolbox always serves the suite under `/apps/app/index.html`.
 */
const CONFORMANCE_IFRAME = 'iframe[src*="/apps/app/index.html"]'

type HostWindowFlags = {
  __sailConformanceOpenError?: string
  __sailConformanceReady?: string
}

async function readHostOpenError(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const w = window as unknown as HostWindowFlags
    return w.__sailConformanceOpenError
  })
}

async function dumpHostDiagnostics(page: Page, consoleLines: string[]): Promise<string> {
  const openError = await readHostOpenError(page).catch(() => undefined)
  const ready = await page
    .evaluate(() => (window as unknown as HostWindowFlags).__sailConformanceReady)
    .catch(() => undefined)
  const iframeCount = await page.locator("iframe").count().catch(() => -1)
  const iframeSrcs = await page
    .locator("iframe")
    .evaluateAll(els => els.map(el => (el as HTMLIFrameElement).src || "(no src)"))
    .catch(() => [] as string[])

  return [
    `host=${hostId} fdc3=${fdc3Version}`,
    `ready=${ready ?? "(unset)"}`,
    `openError=${openError ?? "(none)"}`,
    `iframeCount=${iframeCount}`,
    `iframeSrcs=${JSON.stringify(iframeSrcs)}`,
    `consoleTail:\n${consoleLines.slice(-40).join("\n")}`,
  ].join("\n")
}

test(`FDC3 ${fdc3Version} conformance on ${hostId}`, async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true })

  const consoleLines: string[] = []
  page.on("console", (msg: ConsoleMessage) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`)
  })

  await page.goto("/?appId=Conformance1")

  // Fail fast if the host deep-link open already reported an error.
  await page
    .waitForFunction(
      () => {
        const w = window as unknown as HostWindowFlags
        return Boolean(w.__sailConformanceOpenError) || Boolean(w.__sailConformanceReady)
      },
      undefined,
      { timeout: 90_000 },
    )
    .catch(async () => {
      // Continue to iframe wait — some hosts may not set markers yet.
    })

  const earlyError = await readHostOpenError(page)
  if (earlyError) {
    await page.screenshot({
      path: join(ARTIFACTS, `conformance-open-error-${hostId}-${fdc3Version}.png`),
      fullPage: true,
    })
    throw new Error(`Host deep-link open failed: ${earlyError}`)
  }

  const iframe = page.locator(CONFORMANCE_IFRAME)
  try {
    await iframe.waitFor({ state: "attached", timeout: 120_000 })
  } catch (error: unknown) {
    await page.screenshot({
      path: join(ARTIFACTS, `conformance-iframe-timeout-${hostId}-${fdc3Version}.png`),
      fullPage: true,
    })
    const diagnostics = await dumpHostDiagnostics(page, consoleLines)
    writeFileSync(
      join(ARTIFACTS, `conformance-iframe-timeout-${hostId}-${fdc3Version}.txt`),
      `${diagnostics}\n`,
    )
    throw new Error(
      `Timed out waiting for Conformance1 iframe.\n${diagnostics}\nOriginal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  // sail-v2 welcome splash can sit above the panel iframe and steal clicks.
  const splashClose = page.getByRole("button", { name: "Close" })
  if (await splashClose.isVisible().catch(() => false)) {
    await splashClose.click()
  }

  const frame = page.frameLocator(CONFORMANCE_IFRAME)
  await frame.locator("#testSuite option").first().waitFor({ state: "attached", timeout: 120_000 })
  await frame.locator("#testSuite").selectOption({ label: "All" })

  const mochaFrame = page.frames().find(f => f.url().includes("/apps/app/index.html"))
  if (!mochaFrame) {
    throw new Error("Conformance iframe not found before Run")
  }
  const hooked = await installMochaEndHook(mochaFrame)
  expect(hooked, "mocha.run end hook installed in conformance iframe").toBe(true)

  // force: host chrome (splash / overlays) must not block the in-iframe Run control.
  await frame.locator("#runButton").click({ force: true })

  const outcome = await awaitMochaResult(page).catch(async (error: unknown) => {
    await page.screenshot({
      path: join(ARTIFACTS, `conformance-timeout-${hostId}-${fdc3Version}.png`),
      fullPage: true,
    })
    throw error
  })

  writeFileSync(
    join(ARTIFACTS, `conformance-${hostId}-${fdc3Version}.json`),
    `${JSON.stringify({ host: hostId, fdc3Version, ...outcome }, null, 2)}\n`,
  )

  await page
    .evaluate(selector => {
      const el = document.querySelector<HTMLIFrameElement>(selector)
      const height = el?.contentDocument?.documentElement.scrollHeight
      if (el && height) {
        el.style.height = `${height}px`
      }
      return height ?? 0
    }, CONFORMANCE_IFRAME)
    .catch(() => 0)

  await frame
    .locator("#mocha")
    .screenshot({ path: join(ARTIFACTS, `conformance-${hostId}-${fdc3Version}.png`) })
    .catch(() => {
      // Best-effort: a broken mocha tree means the list never rendered.
    })

  expect(outcome.status, outcome.error ?? "run did not complete").toBe("complete")

  console.log(`${hostId} FDC3 ${fdc3Version}: ${summariseResult(outcome)}`)

  expect(outcome.failures ?? 0, formatFailureReport(outcome)).toBe(0)
  expect(formatFailureReport(outcome)).toBe("")
})
