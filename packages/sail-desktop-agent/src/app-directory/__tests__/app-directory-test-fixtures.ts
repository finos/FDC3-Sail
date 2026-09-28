import { expect } from "vite-plus/test"
import type { DirectoryApp } from "../types"
import type { AgentState } from "../../state/types"

/** Target contract: launchable directory data lives on AgentState, not only on the manager. */
export type AppDirectorySlice = {
  apps: DirectoryApp[]
  directoryUrls: string[]
}

export function expectAppDirectoryOnState(state: AgentState): AppDirectorySlice {
  expect(state).toHaveProperty("appDirectory")
  const slice = (state as AgentState & { appDirectory: AppDirectorySlice }).appDirectory
  expect(Array.isArray(slice.apps)).toBe(true)
  expect(Array.isArray(slice.directoryUrls)).toBe(true)
  return slice
}

export const mockApp1: DirectoryApp = {
  appId: "app-1",
  title: "Test App 1",
  type: "web",
  details: {
    url: "https://example.com/app1",
  },
  interop: {
    intents: {
      listensFor: {
        ViewContact: {
          contexts: ["fdc3.contact"],
          resultType: "fdc3.contact",
        },
      },
    },
  },
}

export const mockApp2: DirectoryApp = {
  appId: "app-2",
  title: "Test App 2",
  type: "web",
  details: {
    url: "https://example.com/app2",
  },
  interop: {
    intents: {
      listensFor: {
        ViewChart: {
          contexts: ["fdc3.instrument"],
        },
      },
    },
  },
}

export const mockApp3: DirectoryApp = {
  appId: "app-3",
  title: "Test App 3",
  type: "native",
  details: {
    path: "/usr/bin/app3",
  },
  interop: {
    intents: {
      listensFor: {
        ViewContact: {
          contexts: ["fdc3.contact", "fdc3.instrument"],
          resultType: "fdc3.contact",
        },
      },
    },
  },
}
