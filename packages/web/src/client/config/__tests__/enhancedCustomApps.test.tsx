import { describe, it, expect } from "vitest"
import {
  convertEnhancedToDirectoryApp,
  convertEnhancedToDirectoryApps,
  convertFromDirectoryApp,
  convertFromDirectoryApps,
  EnhancedEditableState,
} from "../enhancedCustomApps"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import {
  parseAppDInput,
  exportAppDRecord,
  exportAppDCatalog,
} from "../appdParser"
import { STANDARD_FDC3_CATEGORIES } from "../standardCategories"

describe("EnhancedCustomApps - Model & AppD Creation (Issue #194 & #177)", () => {
  const sampleState: EnhancedEditableState = {
    id: "trade-station",
    title: "Trade Station Pro",
    type: "web",
    url: "https://tradestation.example.com",
    path: "",
    arguments: "",
    description: "Multi-asset trading and execution terminal",
    tooltip: "Launch Trade Station",
    lang: "en-US",
    publisher: "FINOS Trading",
    version: "2.1.0",
    categories: ["trading system", "market data", "execution management"],
    contactEmail: "trader-support@example.com",
    supportEmail: "tech@example.com",
    moreInfo: "https://example.com/docs",
    icons: [{ src: "/icons/trade.svg", size: "64x64", type: "image/svg+xml" }],
    screenshots: [
      {
        src: "/images/trade-screen.png",
        size: "1920x1080",
        type: "image/png",
        label: "Main Dashboard",
      },
    ],
    intents: [
      {
        name: "ViewOrders",
        displayName: "View Active Orders",
        contexts: ["fdc3.instrument"],
        resultType: "channel",
      },
    ],
    raisesIntents: [
      {
        name: "ViewChart",
        contexts: ["fdc3.instrument"],
      },
    ],
    userChannelBroadcasts: ["fdc3.instrument"],
    userChannelListensFor: ["fdc3.instrument", "fdc3.order"],
    errors: {},
  }

  it("converts EnhancedEditableState to a valid FDC3 DirectoryApp record", () => {
    const dirApp = convertEnhancedToDirectoryApp(sampleState)

    expect(dirApp.appId).toBe("trade-station")
    expect(dirApp.title).toBe("Trade Station Pro")
    expect(dirApp.name).toBe("Trade Station Pro")
    expect(dirApp.type).toBe("web")
    expect((dirApp.details as any).url).toBe("https://tradestation.example.com")
    expect(dirApp.version).toBe("2.1.0")
    expect(dirApp.publisher).toBe("FINOS Trading")
    expect(dirApp.categories).toContain("trading system")
    expect(dirApp.contactEmail).toBe("trader-support@example.com")
    expect(dirApp.supportEmail).toBe("tech@example.com")
    expect(dirApp.moreInfo).toBe("https://example.com/docs")
    expect(dirApp.icons).toHaveLength(1)
    expect(dirApp.screenshots).toHaveLength(1)

    // Interop
    expect(dirApp.interop?.intents?.listensFor?.ViewOrders).toBeDefined()
    expect(dirApp.interop?.intents?.listensFor?.ViewOrders.displayName).toBe(
      "View Active Orders",
    )
    expect(dirApp.interop?.intents?.raises?.ViewChart).toEqual([
      "fdc3.instrument",
    ])
    expect(dirApp.interop?.userChannels?.broadcasts).toEqual([
      "fdc3.instrument",
    ])
    expect(dirApp.interop?.userChannels?.listensFor).toEqual([
      "fdc3.instrument",
      "fdc3.order",
    ])
  })

  it("converts native application state to launch details with path and arguments", () => {
    const nativeState: EnhancedEditableState = {
      ...sampleState,
      id: "native-terminal",
      type: "native",
      url: "",
      path: "C:\\Program Files\\Terminal\\run.exe",
      arguments: "--config production.json",
    }

    const dirApp = convertEnhancedToDirectoryApp(nativeState)
    expect(dirApp.type).toBe("native")
    expect((dirApp.details as any).path).toBe(
      "C:\\Program Files\\Terminal\\run.exe",
    )
    expect((dirApp.details as any).arguments).toBe("--config production.json")
  })

  it("converts DirectoryApp back to EnhancedEditableState without loss of AppD fields", () => {
    const dirApp = convertEnhancedToDirectoryApp(sampleState)
    const convertedState = convertFromDirectoryApp(dirApp)

    expect(convertedState.id).toBe(sampleState.id)
    expect(convertedState.title).toBe(sampleState.title)
    expect(convertedState.publisher).toBe(sampleState.publisher)
    expect(convertedState.version).toBe(sampleState.version)
    expect(convertedState.contactEmail).toBe(sampleState.contactEmail)
    expect(convertedState.supportEmail).toBe(sampleState.supportEmail)
    expect(convertedState.moreInfo).toBe(sampleState.moreInfo)
    expect(convertedState.categories).toEqual(sampleState.categories)
    expect(convertedState.intents[0].displayName).toBe("View Active Orders")
    expect(convertedState.raisesIntents[0].name).toBe("ViewChart")
    expect(convertedState.userChannelBroadcasts).toEqual(["fdc3.instrument"])
  })

  it("batch converts an array of apps", () => {
    const stateList = [
      sampleState,
      { ...sampleState, id: "app-2", title: "App 2" },
    ]
    const dirApps = convertEnhancedToDirectoryApps(stateList)
    expect(dirApps).toHaveLength(2)

    const recoveredStates = convertFromDirectoryApps(dirApps)
    expect(recoveredStates).toHaveLength(2)
    expect(recoveredStates[0].id).toBe("trade-station")
    expect(recoveredStates[1].id).toBe("app-2")
  })

  it("exports and re-imports through parseAppDInput seamlessly", () => {
    const dirApp = convertEnhancedToDirectoryApp(sampleState)
    const exportedJson = exportAppDRecord(dirApp)

    const reimported = parseAppDInput(exportedJson)
    expect(reimported.success).toBe(true)
    expect(reimported.apps).toHaveLength(1)

    const app = reimported.apps[0]
    expect(app.appId).toBe("trade-station")
    expect(app.title).toBe("Trade Station Pro")
    expect((app.details as any).url).toBe("https://tradestation.example.com")
  })

  it("exports catalog and parses back all applications", () => {
    const app1 = convertEnhancedToDirectoryApp(sampleState)
    const app2: DirectoryApp = {
      appId: "market-app",
      title: "Market App",
      type: "web",
      details: { url: "https://market.com" },
    }

    const catalogJson = exportAppDCatalog([app1, app2])
    const parsedCatalog = parseAppDInput(catalogJson)

    expect(parsedCatalog.success).toBe(true)
    expect(parsedCatalog.apps).toHaveLength(2)
    expect(parsedCatalog.apps[0].appId).toBe("trade-station")
    expect(parsedCatalog.apps[1].appId).toBe("market-app")
  })

  it("contains all standard FDC3 AppD categories", () => {
    expect(STANDARD_FDC3_CATEGORIES).toContain("charts")
    expect(STANDARD_FDC3_CATEGORIES).toContain("market data")
    expect(STANDARD_FDC3_CATEGORIES).toContain("trading system")
    expect(STANDARD_FDC3_CATEGORIES).toContain("compliance")
    expect(STANDARD_FDC3_CATEGORIES).toContain("analytics")
    expect(STANDARD_FDC3_CATEGORIES.length).toBeGreaterThanOrEqual(30)
  })
})
