import { describe, expect, it, vi } from "vite-plus/test"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import type { SailDesktopAgentOptions } from "../../agent/sail-desktop-agent-types"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { retrieveAllApps, retrieveApps, retrieveAppsById } from "../app-directory-queries"
import { createInitialState } from "../../state/initial-state"
import type { AgentState } from "../../state/types"
import {
  addApp,
  addApplications,
  addDirectoryUrl,
  loadDirectoryIntoState,
  replaceDirectoriesInState,
} from "../../state/mutators/app-directory"
import {
  expectAppDirectoryOnState,
  mockApp1,
  mockApp2,
  mockApp3,
} from "./app-directory-test-fixtures"

type DesktopAgentInternals = {
  state: AgentState
}

function asInternals(agent: SailDesktopAgent): DesktopAgentInternals {
  return agent as SailDesktopAgent & DesktopAgentInternals
}

function applyAgentStateUpdate(
  agent: SailDesktopAgent,
  callback: (state: AgentState) => AgentState,
): void {
  const internal = asInternals(agent)
  internal.state = callback(agent.getState())
}

async function applyAgentStateUpdateAsync(
  agent: SailDesktopAgent,
  callback: (state: AgentState) => Promise<AgentState>,
): Promise<void> {
  const internal = asInternals(agent)
  internal.state = await callback(agent.getState())
}

/** Never starts the transport — these tests only exercise state.appDirectory mutators. */
function createAgent(options: SailDesktopAgentOptions = {}): SailDesktopAgent {
  return new SailDesktopAgent(options)
}

describe("AgentState.appDirectory ownership contract", () => {
  it("createInitialState includes empty appDirectory with apps and directoryUrls", () => {
    const state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    const appDirectory = expectAppDirectoryOnState(state)

    expect(appDirectory.apps).toEqual([])
    expect(appDirectory.directoryUrls).toEqual([])
  })

  it("DesktopAgent seeds config.apps into state.appDirectory.apps", () => {
    const agent = createAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [mockApp1, mockApp2],
    })

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toEqual(expect.arrayContaining([mockApp1, mockApp2]))
    expect(retrieveAllApps(appDirectory)).toEqual(appDirectory.apps)
  })

  it("addApp mutator updates state.appDirectory.apps through DesktopAgent", () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })

    applyAgentStateUpdate(agent, state => addApp(state, mockApp1))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toContainEqual(mockApp1)
    expect(retrieveAppsById(appDirectory, "app-1")).toEqual([mockApp1])
  })

  it("addApplications mutator updates state.appDirectory.apps", () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })

    applyAgentStateUpdate(agent, state => addApplications(state, [mockApp1, mockApp2]))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toHaveLength(2)
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2"])
  })

  it("preserves addApplications duplicate appId policy on state.appDirectory.apps", () => {
    const agent = createAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [mockApp1],
    })

    applyAgentStateUpdate(agent, state => addApplications(state, [mockApp1, mockApp2]))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toHaveLength(2)
    expect(appDirectory.apps.filter(app => app.appId === "app-1")).toHaveLength(1)
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2"])
  })

  it("dedupes appIds case-insensitively and keeps the first entry", () => {
    const agent = createAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [mockApp1],
    })
    const upperCaseDuplicate: typeof mockApp1 = {
      ...mockApp1,
      appId: "APP-1",
      title: "Uppercase Duplicate",
    }

    applyAgentStateUpdate(agent, state => addApplications(state, [upperCaseDuplicate, mockApp2]))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toHaveLength(2)
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2"])
    expect(appDirectory.apps.find(app => app.appId.toLowerCase() === "app-1")?.title).toBe(
      "Test App 1",
    )
  })

  it("addDirectoryUrl updates state.appDirectory.directoryUrls", () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })
    const url = "https://example.com/v2/apps"

    applyAgentStateUpdate(agent, state => addDirectoryUrl(state, url))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.directoryUrls).toEqual([url])
  })

  it("loadDirectoryIntoState updates state.appDirectory apps and directoryUrls", async () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })
    const url = "https://example.com/v2/apps"
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue([mockApp1, mockApp2]),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await applyAgentStateUpdateAsync(agent, state => loadDirectoryIntoState(state, url))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps).toHaveLength(2)
    expect(appDirectory.directoryUrls).toContain(url)
    expect(retrieveAllApps(appDirectory)).toEqual(appDirectory.apps)
  })

  it("replaceDirectoriesInState clears and reloads state.appDirectory apps and directoryUrls", async () => {
    const agent = createAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [mockApp1],
    })
    const url = "https://example.com/v2/apps"
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue([mockApp2, mockApp3]),
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await applyAgentStateUpdateAsync(agent, state => replaceDirectoriesInState(state, [url]))

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-2", "app-3"])
    expect(appDirectory.apps.map(app => app.appId)).not.toContain("app-1")
    expect(appDirectory.directoryUrls).toEqual([url])
  })

  it("replaceDirectoriesInState merges apps from all directory URLs", async () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })
    const url1 = "https://example.com/dir1/v2/apps"
    const url2 = "https://example.com/dir2/v2/apps"
    const url3 = "https://example.com/dir3/v2/apps"

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const apps =
        url === url1 ? [mockApp1] : url === url2 ? [mockApp2] : url === url3 ? [mockApp3] : []
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(apps),
      })
    })

    await applyAgentStateUpdateAsync(agent, state =>
      replaceDirectoriesInState(state, [url1, url2, url3]),
    )

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2", "app-3"])
    expect(appDirectory.directoryUrls).toEqual([url1, url2, url3])
  })

  it("replaceDirectoriesInState keeps successful directories when one URL fails", async () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })
    const urlOk1 = "https://example.com/ok1/v2/apps"
    const urlFail = "https://example.com/fail/v2/apps"
    const urlOk2 = "https://example.com/ok2/v2/apps"

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === urlFail) {
        return Promise.resolve({ ok: false, status: 500, statusText: "Server Error" })
      }
      const apps = url === urlOk1 ? [mockApp1] : url === urlOk2 ? [mockApp2] : []
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(apps),
      })
    })

    await applyAgentStateUpdateAsync(agent, state =>
      replaceDirectoriesInState(state, [urlOk1, urlFail, urlOk2]),
    )

    const appDirectory = expectAppDirectoryOnState(agent.getState())
    expect(appDirectory.apps.map(app => app.appId).sort()).toEqual(["app-1", "app-2"])
    expect(appDirectory.directoryUrls).toEqual([urlOk1, urlFail, urlOk2])
  })

  it("query helpers reflect state.appDirectory as the single source of truth", () => {
    const agent = createAgent({ userChannels: DEFAULT_FDC3_USER_CHANNELS })

    applyAgentStateUpdate(agent, state => addApplications(state, [mockApp1, mockApp2, mockApp3]))

    const catalog = expectAppDirectoryOnState(agent.getState())

    expect(retrieveAllApps(catalog)).toEqual(catalog.apps)
    expect(
      retrieveApps(catalog, "fdc3.contact", "ViewContact", undefined).map(app => app.appId),
    ).toEqual(["app-1", "app-3"])
  })
})
