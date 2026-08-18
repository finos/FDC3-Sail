/**
 * Pure query functions over AppDirectoryState (replaces AppDirectoryManager query methods).
 */

import { describe, it, expect, beforeEach } from "vite-plus/test"
import { retrieveAllApps, retrieveAppsById, retrieveIntents } from "../app-directory-queries"
import type { AppDirectoryState } from "../../state/types"
import { mockApp1, mockApp2, mockApp3 } from "./app-directory-test-fixtures"

function catalogWith(...apps: AppDirectoryState["apps"]): AppDirectoryState {
  return { apps, directoryUrls: [] }
}

describe("app-directory-queries", () => {
  let catalog: AppDirectoryState

  beforeEach(() => {
    catalog = catalogWith()
  })

  describe("retrieveAllApps()", () => {
    it("returns all apps from the catalog slice", () => {
      catalog = catalogWith(mockApp1, mockApp2)
      const apps = retrieveAllApps(catalog)
      expect(apps).toHaveLength(2)
      expect(apps).toContainEqual(mockApp1)
      expect(apps).toContainEqual(mockApp2)
    })

    it("returns a copy so callers cannot mutate catalog.apps", () => {
      catalog = catalogWith(mockApp1)
      const apps = retrieveAllApps(catalog)
      apps.push(mockApp2)
      expect(catalog.apps).toHaveLength(1)
    })
  })

  describe("retrieveAppsById()", () => {
    beforeEach(() => {
      catalog = catalogWith(mockApp1, mockApp2)
    })

    it("returns apps with matching appId", () => {
      const apps = retrieveAppsById(catalog, "app-1")
      expect(apps).toHaveLength(1)
      expect(apps[0]).toEqual(mockApp1)
    })

    it("matches appId case-insensitively when no exact match exists", () => {
      const apps = retrieveAppsById(catalog, "APP-1")
      expect(apps).toHaveLength(1)
      expect(apps[0]).toEqual(mockApp1)
    })

    it("returns empty array for non-existent appId", () => {
      expect(retrieveAppsById(catalog, "non-existent")).toHaveLength(0)
    })
  })

  describe("retrieveIntents()", () => {
    beforeEach(() => {
      catalog = catalogWith(mockApp1, mockApp2, mockApp3)
    })

    it("returns all intents when no filters provided", () => {
      const intents = retrieveIntents(catalog, undefined, undefined, undefined)
      expect(intents.length).toBeGreaterThan(0)
    })

    it("filters by contextType", () => {
      const intents = retrieveIntents(catalog, "fdc3.contact", undefined, undefined)
      expect(intents.length).toBeGreaterThan(0)
      intents.forEach(intent => {
        expect(intent.contexts).toContain("fdc3.contact")
      })
    })

    it("filters by intentName", () => {
      const intents = retrieveIntents(catalog, undefined, "ViewContact", undefined)
      expect(intents).toHaveLength(2)
      intents.forEach(intent => {
        expect(intent.intentName).toBe("ViewContact")
      })
    })

    it("filters by resultType", () => {
      const intents = retrieveIntents(catalog, undefined, undefined, "fdc3.contact")
      expect(intents).toHaveLength(2)
      intents.forEach(intent => {
        expect(intent.resultType).toBe("fdc3.contact")
      })
    })

    it("filters by multiple criteria", () => {
      const intents = retrieveIntents(catalog, "fdc3.contact", "ViewContact", "fdc3.contact")
      expect(intents).toHaveLength(2)
      intents.forEach(intent => {
        expect(intent.intentName).toBe("ViewContact")
        expect(intent.contexts).toContain("fdc3.contact")
        expect(intent.resultType).toBe("fdc3.contact")
      })
    })

    it("tags each intent with the appId of the app that declares it", () => {
      const intents = retrieveIntents(catalog, undefined, undefined, undefined)
      expect(intents.map(({ appId, intentName }) => ({ appId, intentName }))).toEqual([
        { appId: "app-1", intentName: "ViewContact" },
        { appId: "app-2", intentName: "ViewChart" },
        { appId: "app-3", intentName: "ViewContact" },
      ])
    })
  })
})
