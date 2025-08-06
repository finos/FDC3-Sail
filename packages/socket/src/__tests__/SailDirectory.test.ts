import { describe, it, expect, beforeEach } from "vitest"
import { DirectoryApp } from "@finos/fdc3-web-impl"
import { SailDirectory, getIcon, DEFAULT_ICON } from "../appd/SailDirectory"

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
})
