import { describe, it, expect } from "vitest"
import {
  parseAppDInput,
  normalizeAppRecord,
  exportAppDRecord,
  exportAppDCatalog,
} from "../appdParser"
import {
  validateTitle,
  validateUrl,
  validateAppId,
  validateVersion,
  validatePublisher,
  validateEmail,
  validateOptionalUrl,
  validateApp,
} from "../validation"
import {
  convertEnhancedToDirectoryApp,
  convertFromDirectoryApp,
  EnhancedEditableState,
} from "../enhancedCustomApps"

describe("FDC3 AppD Parser & Normalizer (Issue #194)", () => {
  it("parses a single AppD JSON record", () => {
    const rawJson = JSON.stringify({
      appId: "market-data-view",
      title: "Market Data Viewer",
      type: "web",
      details: { url: "https://market.example.com" },
      version: "1.2.0",
      publisher: "FinTech Inc",
      categories: ["charts", "market data"],
      interop: {
        intents: {
          listensFor: {
            ViewChart: {
              displayName: "View Chart",
              contexts: ["fdc3.instrument"],
            },
          },
        },
      },
    })

    const result = parseAppDInput(rawJson)
    expect(result.success).toBe(true)
    expect(result.apps).toHaveLength(1)

    const app = result.apps[0]
    expect(app.appId).toBe("market-data-view")
    expect(app.title).toBe("Market Data Viewer")
    expect(app.type).toBe("web")
    expect((app.details as any).url).toBe("https://market.example.com")
    expect(app.version).toBe("1.2.0")
    expect(app.publisher).toBe("FinTech Inc")
    expect(app.categories).toEqual(["charts", "market data"])
    expect(app.interop?.intents?.listensFor?.ViewChart?.contexts).toEqual([
      "fdc3.instrument",
    ])
  })

  it("parses an array of AppD JSON records", () => {
    const rawJson = JSON.stringify([
      {
        appId: "app-1",
        title: "App One",
        type: "web",
        details: { url: "https://one.example.com" },
      },
      {
        appId: "app-2",
        title: "App Two",
        type: "native",
        details: { path: "C:\\AppTwo.exe" },
      },
    ])

    const result = parseAppDInput(rawJson)
    expect(result.success).toBe(true)
    expect(result.apps).toHaveLength(2)
    expect(result.apps[0].appId).toBe("app-1")
    expect(result.apps[1].appId).toBe("app-2")
    expect(result.apps[1].type).toBe("native")
  })

  it("parses an FDC3 App Directory catalog response with 'applications'", () => {
    const catalogJson = JSON.stringify({
      message: "Directory Listing",
      applications: [
        {
          appId: "news-feed",
          title: "News Feed",
          type: "web",
          details: { url: "https://news.example.com" },
          categories: ["news"],
        },
      ],
    })

    const result = parseAppDInput(catalogJson)
    expect(result.success).toBe(true)
    expect(result.apps).toHaveLength(1)
    expect(result.apps[0].appId).toBe("news-feed")
  })

  it("parses an FDC3 App Directory catalog response with 'apps'", () => {
    const catalogJson = JSON.stringify({
      apps: [
        {
          appId: "analytics-tool",
          title: "Analytics Tool",
          type: "web",
          details: { url: "https://analytics.example.com" },
        },
      ],
    })

    const result = parseAppDInput(catalogJson)
    expect(result.success).toBe(true)
    expect(result.apps).toHaveLength(1)
    expect(result.apps[0].appId).toBe("analytics-tool")
  })

  it("gracefully normalizes FDC3 v1 legacy records with 'name' and 'manifestUrl'", () => {
    const v1Json = JSON.stringify({
      name: "Legacy App",
      manifestUrl: "https://legacy.example.com/manifest.json",
      description: "Legacy app description",
    })

    const result = parseAppDInput(v1Json)
    expect(result.success).toBe(true)
    expect(result.apps).toHaveLength(1)
    const app = result.apps[0]
    expect(app.title).toBe("Legacy App")
    expect(app.appId).toBe("legacy-app")
    expect((app.details as any).url).toBe(
      "https://legacy.example.com/manifest.json",
    )
  })

  it("handles empty or whitespace-only input", () => {
    const result = parseAppDInput("   ")
    expect(result.success).toBe(false)
    expect(result.apps).toHaveLength(0)
    expect(result.error).toContain("empty")
  })

  it("handles malformed JSON syntax gracefully", () => {
    const result = parseAppDInput("{ not valid json }")
    expect(result.success).toBe(false)
    expect(result.apps).toHaveLength(0)
    expect(result.error).toContain("Invalid JSON syntax")
  })

  it("normalizes array-style intent definitions into FDC3 v2 map style", () => {
    const raw = {
      appId: "intent-app",
      title: "Intent App",
      type: "web",
      url: "https://app.com",
      interop: {
        intents: {
          listensFor: [
            {
              name: "ViewChart",
              displayName: "Chart Display",
              contexts: ["fdc3.instrument"],
              resultType: "channel",
            },
          ],
        },
      },
    }

    const app = normalizeAppRecord(raw)
    expect(app.interop?.intents?.listensFor?.ViewChart).toBeDefined()
    expect(app.interop?.intents?.listensFor?.ViewChart.displayName).toBe(
      "Chart Display",
    )
    expect(app.interop?.intents?.listensFor?.ViewChart.resultType).toBe(
      "channel",
    )
  })

  it("exports a single AppD record to pretty JSON", () => {
    const app = normalizeAppRecord({
      appId: "my-app",
      title: "My App",
      type: "web",
      url: "https://my.app.com",
    })

    const json = exportAppDRecord(app)
    const parsed = JSON.parse(json)
    expect(parsed.appId).toBe("my-app")
    expect(parsed.title).toBe("My App")
    expect(parsed.details.url).toBe("https://my.app.com")
  })

  it("exports all apps as an FDC3 AppD catalog JSON", () => {
    const app1 = normalizeAppRecord({
      appId: "a1",
      title: "App 1",
      url: "https://a1.com",
    })
    const app2 = normalizeAppRecord({
      appId: "a2",
      title: "App 2",
      url: "https://a2.com",
    })

    const json = exportAppDCatalog([app1, app2])
    const parsed = JSON.parse(json)
    expect(parsed.applications).toHaveLength(2)
    expect(parsed.applications[0].appId).toBe("a1")
    expect(parsed.applications[1].appId).toBe("a2")
  })
})

describe("App Validation Functions (Issue #194 & #177)", () => {
  it("validates required title", () => {
    expect(validateTitle("").isValid).toBe(false)
    expect(validateTitle("A").isValid).toBe(false)
    expect(validateTitle("Valid App Title").isValid).toBe(true)
  })

  it("validates web app URL", () => {
    expect(validateUrl("", "web").isValid).toBe(false)
    expect(validateUrl("not-a-url", "web").isValid).toBe(false)
    expect(validateUrl("ftp://bad.com", "web").isValid).toBe(false)
    expect(validateUrl("https://example.com/app", "web").isValid).toBe(true)
    expect(validateUrl("", "native").isValid).toBe(true)
  })

  it("validates App ID format", () => {
    expect(validateAppId("").isValid).toBe(false)
    expect(validateAppId("ab").isValid).toBe(false)
    expect(validateAppId("-start-hyphen").isValid).toBe(false)
    expect(validateAppId("valid-app.id_123").isValid).toBe(true)
  })

  it("validates semantic version format", () => {
    expect(validateVersion("").isValid).toBe(false)
    expect(validateVersion("1.0").isValid).toBe(false)
    expect(validateVersion("v1.0.0").isValid).toBe(false)
    expect(validateVersion("1.0.0").isValid).toBe(true)
    expect(validateVersion("2.14.9").isValid).toBe(true)
  })

  it("validates publisher name", () => {
    expect(validatePublisher("").isValid).toBe(false)
    expect(validatePublisher("X").isValid).toBe(false)
    expect(validatePublisher("FINOS").isValid).toBe(true)
  })

  it("validates email addresses", () => {
    expect(validateEmail("").isValid).toBe(true) // optional
    expect(validateEmail("not-an-email").isValid).toBe(false)
    expect(validateEmail("support@example.com").isValid).toBe(true)
  })

  it("validates optional URLs", () => {
    expect(validateOptionalUrl("").isValid).toBe(true) // optional
    expect(validateOptionalUrl("bad-url").isValid).toBe(false)
    expect(validateOptionalUrl("https://example.com/docs").isValid).toBe(true)
  })

  it("validates a complete application state", () => {
    const validApp = {
      id: "valid-app",
      title: "Valid App",
      type: "web" as const,
      url: "https://example.com",
      publisher: "FINOS",
      version: "1.0.0",
      description: "App description",
      contactEmail: "info@example.com",
      supportEmail: "support@example.com",
      moreInfo: "https://example.com/info",
    }

    const errors = validateApp(validApp)
    expect(Object.keys(errors)).toHaveLength(0)

    const invalidApp = {
      ...validApp,
      title: "",
      url: "invalid-url",
      contactEmail: "bad-email",
    }
    const invalidErrors = validateApp(invalidApp)
    expect(invalidErrors.title).toBeDefined()
    expect(invalidErrors.url).toBeDefined()
    expect(invalidErrors.contactEmail).toBeDefined()
  })
})

describe("Enhanced State Conversion (Issue #194)", () => {
  it("converts between EnhancedEditableState and DirectoryApp losslessly", () => {
    const state: EnhancedEditableState = {
      id: "chart-app",
      title: "Chart Viewer",
      type: "web",
      url: "https://charts.example.com",
      path: "",
      arguments: "",
      description: "Interactive financial charting",
      tooltip: "Launch Chart Viewer",
      lang: "en-US",
      publisher: "FINOS",
      version: "1.0.0",
      categories: ["charts", "visualization"],
      contactEmail: "contact@finos.org",
      supportEmail: "support@finos.org",
      moreInfo: "https://finos.org/charts",
      icons: [{ src: "/icons/chart.png" }],
      screenshots: [{ src: "/images/chart.png", label: "Chart Preview" }],
      intents: [
        {
          name: "ViewChart",
          displayName: "Display Chart",
          contexts: ["fdc3.instrument"],
          resultType: "channel",
        },
      ],
      raisesIntents: [
        {
          name: "ViewNews",
          contexts: ["fdc3.instrument"],
        },
      ],
      userChannelBroadcasts: ["fdc3.instrument"],
      userChannelListensFor: ["fdc3.chart"],
      errors: {},
    }

    const dirApp = convertEnhancedToDirectoryApp(state)
    expect(dirApp.appId).toBe("chart-app")
    expect(dirApp.title).toBe("Chart Viewer")
    expect(dirApp.categories).toContain("charts")
    expect(dirApp.contactEmail).toBe("contact@finos.org")
    expect(dirApp.interop?.intents?.listensFor?.ViewChart?.displayName).toBe(
      "Display Chart",
    )
    expect(dirApp.interop?.intents?.raises?.ViewNews).toEqual([
      "fdc3.instrument",
    ])
    expect(dirApp.interop?.userChannels?.broadcasts).toEqual([
      "fdc3.instrument",
    ])

    const roundtrip = convertFromDirectoryApp(dirApp)
    expect(roundtrip.id).toBe(state.id)
    expect(roundtrip.title).toBe(state.title)
    expect(roundtrip.url).toBe(state.url)
    expect(roundtrip.intents[0].displayName).toBe("Display Chart")
    expect(roundtrip.raisesIntents[0].name).toBe("ViewNews")
  })
})
