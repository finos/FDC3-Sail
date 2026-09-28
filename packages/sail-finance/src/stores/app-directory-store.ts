import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import type { DirectoryApp } from "../types/common"

interface AppDirectoryState {
  apps: DirectoryApp[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  directoryUrls: string[]
}

interface AppDirectoryActions {
  setApps: (apps: DirectoryApp[]) => void
  addApp: (app: DirectoryApp) => void
  removeApp: (appId: string) => void
  updateApp: (appId: string, updates: Partial<DirectoryApp>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearApps: () => void
  loadApps: () => void
  refreshApps: () => Promise<void>
  setDirectoryUrls: (urls: string[]) => void
  loadDirectoriesFromUrls: (urls: string[]) => Promise<void>
}

export interface AppDirectoryStore extends AppDirectoryState, AppDirectoryActions {}

export const createAppDirectoryStore = (agent: SailDesktopAgent) =>
  create<AppDirectoryStore>()(
    immer((set, get) => ({
      apps: [] as DirectoryApp[],
      isLoading: false,
      error: null as string | null,
      lastUpdated: null as Date | null,
      directoryUrls: [] as string[],

      setApps: (apps: DirectoryApp[]) =>
        set(state => {
          state.apps = apps
          state.lastUpdated = new Date()
          state.error = null
        }),

      addApp: (app: DirectoryApp) =>
        set(state => {
          const existingIndex = state.apps.findIndex((a: DirectoryApp) => a.appId === app.appId)
          if (existingIndex >= 0) {
            state.apps[existingIndex] = app
          } else {
            state.apps.push(app)
          }
          state.lastUpdated = new Date()
        }),

      removeApp: (appId: string) =>
        set(state => {
          state.apps = state.apps.filter((app: DirectoryApp) => app.appId !== appId)
          state.lastUpdated = new Date()
        }),

      updateApp: (appId: string, updates: Partial<DirectoryApp>) =>
        set(state => {
          const appIndex = state.apps.findIndex((app: DirectoryApp) => app.appId === appId)
          if (appIndex >= 0) {
            state.apps[appIndex] = { ...state.apps[appIndex]!, ...updates }
            state.lastUpdated = new Date()
          }
        }),

      setLoading: (loading: boolean) =>
        set(state => {
          state.isLoading = loading
        }),

      setError: (error: string | null) =>
        set(state => {
          state.error = error
          if (error) {
            state.isLoading = false
          }
        }),

      clearApps: () =>
        set(state => {
          state.apps = []
          state.lastUpdated = new Date()
          state.error = null
        }),

      setDirectoryUrls: (urls: string[]) =>
        set(state => {
          state.directoryUrls = urls
        }),

      loadApps: () => {
        const { setLoading, setError, setApps } = get()

        try {
          setLoading(true)
          setError(null)
          setApps(agent.apps.getAll())
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to load apps"
          setError(errorMessage)
          console.error("Failed to load app directory:", error)
        } finally {
          setLoading(false)
        }
      },

      loadDirectoriesFromUrls: async (urls: string[]) => {
        const { setLoading, setError, loadApps, setDirectoryUrls } = get()

        try {
          setLoading(true)
          setError(null)
          setDirectoryUrls(urls)

          for (const url of urls) {
            await agent.apps.addDirectory(url)
          }

          loadApps()
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load directories from URLs"
          setError(errorMessage)
          console.error("Failed to load directories from URLs:", error)
        } finally {
          setLoading(false)
        }
      },

      refreshApps: () => {
        const { loadApps } = get()
        loadApps()
        return Promise.resolve()
      },
    })),
  )
