import { describe, it, expect, beforeEach } from "vitest"
import { DirectoryApp } from "@finos/fdc3-web-impl"
import { SailDirectory, getIcon, DEFAULT_ICON } from "../appd/SailDirectory"
import { resolve } from "path"
import { writeFileSync, unlinkSync } from "fs"

// Test apps for direct testing
const webApp1: DirectoryApp = {
  appId: "web-app-1",
  name: "Web App 1",
  title: "Test Web Application",
  type: "web",
  details: { url: "https://example.com/app1" },
  icons: [{ src: "/icons/web-app-1.png" }],
}

const webApp2: DirectoryApp = {
  appId: "web-app-2",
  name: "Web App 2",
  title: "Another Web App",
  type: "web",
  details: { url: "https://example.com/app2" },
}

const nativeApp: DirectoryApp = {
  appId: "native-app-1",
  name: "Native App 1",
  title: "Test Native Application",
  type: "native",
  details: { path: "/path/to/native/app" },
  icons: [{ src: "/icons/native-app-1.png" }],
}

const citrixApp: DirectoryApp = {
  appId: "citrix-app-1",
  name: "Citrix App 1",
  title: "Test Citrix Application",
  type: "citrix",
  details: { alias: "citrix-app-alias" },
}

const otherApp: DirectoryApp = {
  appId: "other-app",
  name: "Other App",
  title: "Test Other Applications",
  type: "other",
  details: {},
}

describe("SailDirectory", () => {
  let directory: SailDirectory

  beforeEach(() => {
    directory = new SailDirectory()
  })

  describe("getIcon utility", () => {
    it("should return app icon if available", () => {
      expect(getIcon(webApp1)).toBe("/icons/web-app-1.png")
    })

    it("should return default icon if no icons", () => {
      expect(getIcon(webApp2)).toBe(DEFAULT_ICON)
    })

    it("should return default icon if app is undefined", () => {
      expect(getIcon(undefined)).toBe(DEFAULT_ICON)
    })
  })

  describe("app management", () => {
    it("should start with empty directory", () => {
      expect(directory.retrieveAllApps()).toHaveLength(0)
    })

    it("should add individual apps", () => {
      directory.add(webApp1)
      directory.add(nativeApp)

      expect(directory.retrieveAllApps()).toHaveLength(2)
      expect(directory.retrieveAllApps()[0].appId).toBe("web-app-1")
      expect(directory.retrieveAllApps()[1].appId).toBe("native-app-1")
    })

    it("should handle different app types", () => {
      directory.add(webApp1)
      directory.add(nativeApp)
      directory.add(citrixApp)
      directory.add(otherApp)

      const apps = directory.retrieveAllApps()
      expect(apps).toHaveLength(4)
      expect(apps.find((app) => app.type === "web")).toBeDefined()
      expect(apps.find((app) => app.type === "native")).toBeDefined()
      expect(apps.find((app) => app.type === "citrix")).toBeDefined()
      expect(apps.find((app) => app.type === "other")).toBeDefined()
    })
  })

  describe("app filtering", () => {
    beforeEach(() => {
      directory.add(webApp1)
      directory.add(webApp2)
      directory.add(nativeApp)
    })

    it("should retrieve apps by URL", () => {
      const apps = directory.retrieveAppsByUrl("https://example.com/app1")

      expect(apps).toHaveLength(1)
      expect(apps[0].appId).toBe("web-app-1")
    })

    it("should return empty array for non-matching URL", () => {
      const apps = directory.retrieveAppsByUrl("https://nonexistent.com")
      expect(apps).toHaveLength(0)
    })

    it("should only return web apps for URL filtering", () => {
      const apps = directory.retrieveAppsByUrl("https://example.com/app2")

      expect(apps).toHaveLength(1)
      expect(apps[0].type).toBe("web")
    })
  })

  describe("Real File Loading", () => {
    const testDataDir = __dirname
    const webAppsPath = resolve(testDataDir, "testData/webApps.json")
    const nativeAppsPath = resolve(testDataDir, "testData/nativeApps.json")

    it("should load apps from real JSON files", async () => {
      const directory = new SailDirectory()
      
      await directory.replace([webAppsPath, nativeAppsPath])
      
      const apps = directory.retrieveAllApps()
      expect(apps.length).toBeGreaterThan(0)
      
      // Verify we have apps from both files
      const webApps = apps.filter(app => app.type === "web")
      const nativeApps = apps.filter(app => app.type === "native")
      const citrixApps = apps.filter(app => app.type === "citrix")
      
      expect(webApps.length).toBeGreaterThan(0)
      expect(nativeApps.length).toBeGreaterThan(0)
      expect(citrixApps.length).toBeGreaterThan(0)
    })

    it("should load realistic FDC3 apps with intents and contexts", async () => {
      const directory = new SailDirectory()
      
      await directory.replace([webAppsPath])
      
      const apps = directory.retrieveAllApps()
      const marketTerminal = apps.find(app => app.appId === "market-terminal")
      
      expect(marketTerminal).toBeDefined()
      expect(marketTerminal?.intents).toBeDefined()
      expect(marketTerminal?.intents?.length).toBeGreaterThan(0)
      
      const viewInstrumentIntent = marketTerminal?.intents?.find(
        intent => intent.name === "ViewInstrument"
      )
      expect(viewInstrumentIntent).toBeDefined()
      expect(viewInstrumentIntent?.contexts).toContain("fdc3.instrument")
    })

    it("should handle URL filtering with realistic web apps", async () => {
      const directory = new SailDirectory()
      
      await directory.replace([webAppsPath])
      
      const apps = directory.retrieveAppsByUrl("https://terminal.example.com")
      expect(apps).toHaveLength(1)
      expect(apps[0].appId).toBe("market-terminal")
      expect(apps[0].type).toBe("web")
    })

    it("should load native apps with proper path and arguments", async () => {
      const directory = new SailDirectory()
      
      await directory.replace([nativeAppsPath])
      
      const apps = directory.retrieveAllApps()
      const excelAddin = apps.find(app => app.appId === "excel-addin")
      
      expect(excelAddin).toBeDefined()
      expect(excelAddin?.type).toBe("native")
      expect(excelAddin?.details?.path).toContain(".exe")
      expect(excelAddin?.details?.arguments).toBeDefined()
      expect(Array.isArray(excelAddin?.details?.arguments)).toBe(true)
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed JSON gracefully", async () => {
      const directory = new SailDirectory()
      const malformedPath = resolve(__dirname, "testData/malformed.json")
      
      // Create malformed JSON file
      writeFileSync(malformedPath, '{"applications": [{"appId": "broken"')
      
      try {
        await expect(directory.replace([malformedPath])).rejects.toThrow()
      } finally {
        // Clean up
        unlinkSync(malformedPath)
      }
    })

    it("should handle missing files gracefully", async () => {
      const directory = new SailDirectory()
      const nonExistentPath = resolve(__dirname, "testData/nonexistent.json")
      
      await expect(directory.replace([nonExistentPath])).rejects.toThrow()
    })

    it("should handle empty applications array", async () => {
      const directory = new SailDirectory()
      const emptyPath = resolve(__dirname, "testData/empty.json")
      
      // Create empty applications file
      writeFileSync(emptyPath, '{"applications": []}')
      
      try {
        await directory.replace([emptyPath])
        
        const apps = directory.retrieveAllApps()
        expect(apps).toHaveLength(0)
      } finally {
        // Clean up
        unlinkSync(emptyPath)
      }
    })
  })
})
