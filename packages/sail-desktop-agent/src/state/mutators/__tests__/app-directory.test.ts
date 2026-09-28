/**
 * AgentState mutators for the app directory catalog slice.
 */

import { describe, it, expect, vi, beforeEach } from "vite-plus/test"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../../agent/default-user-channels"
import { createInitialState } from "../../initial-state"
import type { AgentState } from "../../types"
import type { DirectoryApp, DirectoryData } from "../../../app-directory/types"
import { addApplications, addDirectoryUrl, loadDirectoryIntoState } from "../app-directory"
import { retrieveAllApps, retrieveAppsById } from "../../../app-directory/app-directory-queries"
import {
  expectAppDirectoryOnState,
  mockApp1,
  mockApp2,
  mockApp3,
} from "../../../app-directory/__tests__/app-directory-test-fixtures"

describe("app-directory mutators", () => {
  let state: AgentState

  beforeEach(() => {
    state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
  })

  describe("addApplications()", () => {
    it("adds apps from array format to state.appDirectory.apps", () => {
      state = addApplications(state, [mockApp1, mockApp2])

      const appDirectory = expectAppDirectoryOnState(state)
      expect(appDirectory.apps).toHaveLength(2)
      expect(retrieveAppsById(appDirectory, "app-1")).toHaveLength(1)
      expect(retrieveAppsById(appDirectory, "app-2")).toHaveLength(1)
    })

    it("adds apps from DirectoryData format", () => {
      const data: DirectoryData = {
        applications: [mockApp1, mockApp2],
      }
      state = addApplications(state, data)

      expect(expectAppDirectoryOnState(state).apps).toHaveLength(2)
    })

    it("preserves duplicate appId policy (skips existing appIds)", () => {
      state = addApplications(state, [mockApp1])
      state = addApplications(state, [mockApp1, mockApp2])

      const appDirectory = expectAppDirectoryOnState(state)
      expect(appDirectory.apps).toHaveLength(2)
      expect(appDirectory.apps.filter(app => app.appId === "app-1")).toHaveLength(1)
    })

    it("dedupes appIds case-insensitively and keeps the first entry", () => {
      state = addApplications(state, [mockApp1])
      state = addApplications(state, [
        { ...mockApp1, appId: "APP-1", title: "Uppercase Duplicate" },
        mockApp2,
      ])

      const appDirectory = expectAppDirectoryOnState(state)
      expect(appDirectory.apps).toHaveLength(2)
      expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2"])
      expect(appDirectory.apps.find(app => app.appId.toLowerCase() === "app-1")?.title).toBe(
        "Test App 1",
      )
    })

    it("validates required fields", () => {
      const invalidApp = {
        appId: "invalid",
      } as DirectoryApp

      expect(() => addApplications(state, [invalidApp])).toThrow("missing required fields")
    })

    it("throws for invalid data format", () => {
      expect(() => addApplications(state, { invalid: "data" } as unknown as DirectoryData)).toThrow(
        "Invalid data format",
      )
    })
  })

  describe("addDirectoryUrl()", () => {
    it("appends a valid directory URL to state.appDirectory.directoryUrls", () => {
      const url = "https://example.com/v2/apps"
      state = addDirectoryUrl(state, url)

      expect(expectAppDirectoryOnState(state).directoryUrls).toEqual([url])
    })

    it("does not add duplicate URLs", () => {
      const url = "https://example.com/v2/apps"
      state = addDirectoryUrl(state, url)
      state = addDirectoryUrl(state, url)

      expect(expectAppDirectoryOnState(state).directoryUrls).toHaveLength(1)
    })

    it("throws for invalid URL", () => {
      expect(() => addDirectoryUrl(state, "not-a-url")).toThrow("Invalid directory URL")
    })
  })

  describe("loadDirectoryIntoState()", () => {
    it("merges fetched apps with the same dedupe policy as addApplications", async () => {
      state = addApplications(state, [mockApp1])

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([mockApp1, mockApp2]),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      state = await loadDirectoryIntoState(state, "https://example.com/v2/apps")

      const appDirectory = expectAppDirectoryOnState(state)
      expect(appDirectory.apps).toHaveLength(2)
      expect(appDirectory.directoryUrls).toContain("https://example.com/v2/apps")
      expect(retrieveAllApps(appDirectory)).toEqual(appDirectory.apps)
    })

    it("handles DirectoryData response format from fetch", async () => {
      const mockData: DirectoryData = {
        applications: [mockApp1, mockApp2],
      }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockData),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      state = await loadDirectoryIntoState(state, "https://example.com/v2/apps")

      expect(expectAppDirectoryOnState(state).apps).toHaveLength(2)
    })

    it("throws when fetch fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

      await expect(loadDirectoryIntoState(state, "https://example.com/v2/apps")).rejects.toThrow(
        "Failed to load applications",
      )
    })
  })

  describe("fetch + mutator merge parity", () => {
    it("loadDirectoryIntoState then addApplications uses the same dedupe policy", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([mockApp1, mockApp2]),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      state = await loadDirectoryIntoState(state, "https://example.com/v2/apps")
      state = addApplications(state, [mockApp1, mockApp3])

      const apps = expectAppDirectoryOnState(state).apps
      expect(apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2", "app-3"])
      expect(apps.filter(app => app.appId === "app-1")).toHaveLength(1)
    })
  })
})
