import { Before, DataTable, Given, Then, When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import type { Context, AppIdentifier } from "@finos/fdc3"
import type { BrowserTypes } from "@finos/fdc3"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../src/agent/default-user-channels.ts"
import { handleResolve } from "../support/testing-utils"

/** FINOS conformance BDD uses short user-channel ids (e.g. app-channels.feature "one"). */
const CUCUMBER_CONFORMANCE_USER_CHANNELS: BrowserTypes.Channel[] = [
  {
    id: "one",
    type: "user",
    displayMetadata: { name: "One" },
  },
]

export const APP_FIELD = "apps"

export const contextMap: Record<string, Context> = {
  "fdc3.instrument": {
    type: "fdc3.instrument",
    name: "Apple",
    id: {
      ticker: "AAPL",
    },
  },
  "fdc3.country": {
    type: "fdc3.country",
    name: "Sweden",
    id: {
      COUNTRY_ISOALPHA2: "SE",
      COUNTRY_ISOALPHA3: "SWE",
    },
  },
  "fdc3.unsupported": {
    type: "fdc3.unsupported",
    bogus: true,
  },
  "fdc3.book": {
    type: "fdc3.book",
    author: "Tim Berners-Lee",
    title: "This is for everyone",
    id: {
      ISBN: "1234",
    },
  },
  "fdc3.magazine": {
    type: "fdc3.magazine",
    title: "The Economist",
    price: 3.99,
    id: {
      ISSN: "1234",
    },
  },
  "fdc3.periodical": {
    type: "fdc3.periodical",
    title: "The American Poetry Review",
    price: 13.99,
    id: {
      ISSN: "45643",
    },
  },
  "fdc3.product": {
    type: "fdc3.product",
    title: "Current bun",
    id: {
      productId: "cb1",
    },
  },
  "fdc3.portfolio": {
    type: "fdc3.portfolio",
    name: "My Portfolio",
    positions: [
      {
        type: "fdc3.instrument",
        id: {
          ticker: "AAPL",
        },
        holding: 100,
      },
      {
        type: "fdc3.instrument",
        id: {
          ticker: "MSFT",
        },
        holding: 50,
      },
    ],
  },
  testContextX: {
    type: "testContextX",
  },
  "fdc3.chart": {
    type: "fdc3.chart",
    instruments: [
      {
        type: "fdc3.instrument",
        id: {
          ticker: "AAPL",
        },
      },
    ],
    range: {
      type: "fdc3.timeRange",
      startTime: new Date("2024-01-01").toISOString(),
      endTime: new Date("2024-12-31").toISOString(),
    },
  },
  // Intentionally missing required `type` field — used in MalformedContext conformance scenarios
  "fdc3.malformed": { bogus: true } as unknown as Context,
  // fdc3.nothing — used to raise an intent without context (FDC3 2.2 spec §intents)
  "fdc3.nothing": { type: "fdc3.nothing" },
}

/**
 * Helper to create message metadata from app identifier string.
 * Supports FDC3 AppIdentifier-like formats:
 * - "appId" (instanceId optional)
 * - "appId: App1, instanceId: a1" (explicit FDC3 AppIdentifier format)
 */
export function createMeta(cw: CustomWorld, appStr: string) {
  let app: AppIdentifier
  const desktopAgentName = cw.desktopAgent?.getImplementationMetadata()?.provider ?? "unknown"

  // Parse FDC3 AppIdentifier format: "appId: App1, instanceId: a1"
  if (appStr.includes("appId:") && appStr.includes("instanceId:")) {
    const appIdMatch = appStr.match(/appId:\s*([^,]+)/)
    const instanceIdMatch = appStr.match(/instanceId:\s*(.+)/)
    const appId = appIdMatch?.[1]?.trim()
    const instanceId = instanceIdMatch?.[1]?.trim()
    const resolvedInstanceId =
      cw.props.instances && cw.props.instances[appStr] ? cw.props.instances[appStr] : instanceId

    if (appId) {
      app = resolvedInstanceId
        ? { appId, instanceId: resolvedInstanceId, desktopAgent: desktopAgentName }
        : { appId, desktopAgent: desktopAgentName }
    } else {
      throw new Error(`Invalid AppIdentifier format: ${appStr}`)
    }
  }
  // Simple format: just appId
  else {
    app = { appId: appStr, desktopAgent: desktopAgentName }
  }

  return {
    requestUuid: cw.createUUID(),
    timestamp: new Date(),
    source: app,
  }
}

/**
 * Helper to parse app identifier string and get/create instance ID.
 * Returns the instance ID that should be used for this app.
 * Supports FDC3 AppIdentifier-like formats:
 * - "appId: App1, instanceId: a1" (explicit FDC3 AppIdentifier format)
 * - "appId" (will generate instance ID)
 */
export function getAppInstanceId(cw: CustomWorld, appStr: string): string {
  // Check if instance ID is already stored in props
  if (!cw.props.instances) {
    cw.props.instances = {}
  }

  // Parse FDC3 AppIdentifier format: "appId: App1, instanceId: a1"
  if (appStr.includes("appId:") && appStr.includes("instanceId:")) {
    const instanceIdMatch = appStr.match(/instanceId:\s*(.+)/)
    const instanceId = instanceIdMatch?.[1]?.trim()
    if (instanceId) {
      cw.props.instances[appStr] = instanceId
      return instanceId
    }
  }

  // Otherwise, look up or generate instance ID for this app
  if (cw.props.instances[appStr]) {
    return cw.props.instances[appStr]
  }

  // Generate new instance ID
  const instanceId = `uuid-${Object.keys(cw.props.instances).length}`
  cw.props.instances[appStr] = instanceId
  return instanceId
}

/** User channels for Cucumber: FDC3 2.2 defaults plus conformance-only ids. */
function cucumberUserChannels(): BrowserTypes.Channel[] {
  return [...DEFAULT_FDC3_USER_CHANNELS, ...CUCUMBER_CONFORMANCE_USER_CHANNELS]
}

// Create a desktop agent by default before each scenario
// Scenarios can call "A desktop agent" again to reset with different apps
Before(function (this: CustomWorld) {
  const apps = this.props[APP_FIELD] ?? []

  // Initialize DesktopAgent with clean architecture
  this.initializeDesktopAgent(apps, cucumberUserChannels())
})

Given("A desktop agent", function (this: CustomWorld) {
  const apps = this.props[APP_FIELD] ?? []

  // Reinitialize DesktopAgent (useful when apps are defined after the Before hook runs,
  // or when you need a fresh desktop agent mid-scenario)
  this.initializeDesktopAgent(apps, cucumberUserChannels())
})

Given("A desktop agent advertising FDC3 {string}", function (this: CustomWorld, version: string) {
  const apps = this.props[APP_FIELD] ?? []
  this.props.fdc3Version = version
  this.initializeDesktopAgent(apps, cucumberUserChannels(), undefined, version)
})

Given("the mock intent resolver will cancel the resolution", function (this: CustomWorld) {
  this.mockIntentResolver.cancelNextResolution()
})

Given(
  "the app launcher will fail on launch for {string}",
  function (this: CustomWorld, appId: string) {
    this.mockAppLauncher.setAppToFailOnLaunch(appId)
  },
)

Given("A desktop agent with heartbeat checking", function (this: CustomWorld) {
  const apps = this.props[APP_FIELD] ?? []

  // Initialize DesktopAgent with heartbeat timers enabled for this scenario.
  this.initializeDesktopAgent(apps, cucumberUserChannels(), {
    intervalMs: 500,
    timeoutMs: 2000,
  })
})

When("I shutdown the server", function (this: CustomWorld) {
  // Disconnect transport to simulate shutdown
  this.mockTransport.disconnect()
})

Given("I alias the last private channel as {string}", function (this: CustomWorld, name: string) {
  if (!this.props.lastPrivateChannelId) {
    throw new Error("No private channel created yet; create one before aliasing")
  }
  this.props[name] = this.props.lastPrivateChannelId
})

When("we wait for a period of {string} ms", async function (this: CustomWorld, ms: string) {
  await new Promise(resolve => setTimeout(resolve, parseInt(ms, 10)))
})

When("we wait for the listener timeout", async function (this: CustomWorld) {
  // Default listener timeout
  await new Promise(resolve => setTimeout(resolve, 2100))
})

Then("{string} is true", function (this: CustomWorld, propName: string) {
  const resolved = handleResolve(propName, this)
  const value = typeof resolved === "string" ? this.props[resolved] : resolved
  if (value !== true) {
    throw new Error(`Expected ${propName} to be true, but got ${JSON.stringify(value)}`)
  }
})

Then("{string} is false", function (this: CustomWorld, propName: string) {
  const resolved = handleResolve(propName, this)
  const value = typeof resolved === "string" ? this.props[resolved] : resolved
  if (value !== false) {
    throw new Error(`Expected ${propName} to be false, but got ${JSON.stringify(value)}`)
  }
})

Then("{string} is empty", function (this: CustomWorld, propName: string) {
  const resolved = handleResolve(propName, this)
  const value = typeof resolved === "string" ? this.props[resolved] : resolved
  if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
    throw new Error(`Expected ${propName} to be empty, but got ${JSON.stringify(value)}`)
  }
})

Then(
  "{string} is an array of objects with the following contents",
  function (this: CustomWorld, propName: string, dataTable: DataTable) {
    const resolved = handleResolve(propName, this)
    const value = typeof resolved === "string" ? this.props[resolved] : resolved
    if (!Array.isArray(value)) {
      throw new Error(`Expected ${propName} to be an array, but got ${JSON.stringify(value)}`)
    }

    const expectedRaw = dataTable.hashes() as unknown
    if (!Array.isArray(expectedRaw)) {
      throw new Error(`Expected ${propName} expectations to be an array`)
    }
    const expected = expectedRaw as Array<Record<string, string>>

    const valueArray = value as unknown[]
    if (valueArray.length !== expected.length) {
      throw new Error(`Expected array length ${expected.length}, but got ${valueArray.length}`)
    }

    const isRecord = (input: unknown): input is Record<string, unknown> =>
      typeof input === "object" && input !== null

    // Simple comparison - could be enhanced
    for (let i = 0; i < expected.length; i++) {
      const expectedRow = expected[i]!
      const actualRow = valueArray[i]
      if (!isRecord(actualRow)) {
        throw new Error(
          `Expected ${propName}[${i}] to be an object, but got ${JSON.stringify(actualRow)}`,
        )
      }

      for (const [key, expectedValue] of Object.entries(expectedRow)) {
        const actualValue = actualRow[key]
        if (actualValue !== expectedValue) {
          throw new Error(
            `Expected ${propName}[${i}].${key} to be ${expectedValue}, but got ${String(
              actualValue,
            )}`,
          )
        }
      }
    }
  },
)
