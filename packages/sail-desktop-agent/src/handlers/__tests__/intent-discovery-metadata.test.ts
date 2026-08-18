import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import { MockTransport } from "../../__tests__/utils/mock-transport"
import type { DirectoryApp } from "../../app-directory/types"
import { retrieveIntents } from "../../app-directory/app-directory-queries"
import { expectAppDirectoryOnState } from "../../app-directory/__tests__/app-directory-test-fixtures"
import { addApplications } from "../../state/mutators/app-directory"
import { SailDesktopAgent } from "../../agent/sail-desktop-agent"
import { DEFAULT_FDC3_USER_CHANNELS } from "../../agent/default-user-channels"
import { connectInstance, updateInstanceState } from "../../state/mutators"
import { registerIntentListener } from "../../state/mutators/intent"
import { createInitialState } from "../../state/initial-state"
import { AppInstanceState, type AgentState } from "../../state/types"
import { createDACPTestParams, createDacpRequestMeta, withResponseDispatcher } from "./test-params"
import { createAppIntents, findIntentsByContext } from "../intents/intent-helpers"
import { handleFindIntentRequest } from "../intents/intent-discovery-handlers"

const INTENT_APP_A_DISPLAY_NAME = "A Testing Intent"
const INTENT_APP_A_INTENT_NAME = "aTestingIntent"
const TEST_CONTEXT_X = "testContextX"

/** Mirrors intent-a / IntentAppAId from conformance-appd.json */
const intentAppA: DirectoryApp = {
  appId: "IntentAppAId",
  name: "IntentAppA",
  title: "Intent App A",
  description: "Part of the FDC3 Conformance Tests",
  type: "web",
  details: {
    url: "https://fdc3.finos.org/toolbox/fdc3-conformance/apps/intent-a/index.html",
  },
  version: "1.0.0",
  interop: {
    intents: {
      listensFor: {
        [INTENT_APP_A_INTENT_NAME]: {
          displayName: INTENT_APP_A_DISPLAY_NAME,
          contexts: [TEST_CONTEXT_X, "testContextZ"],
        },
        sharedTestingIntent1: {
          displayName: "Shared Testing Intent 1",
          contexts: [TEST_CONTEXT_X],
        },
      },
    },
  },
}

function loadConformanceIntentAppA(): DirectoryApp {
  const raw = readFileSync(
    new URL("../../../../sail-conformance-harness/conformance-appd.json", import.meta.url),
    "utf-8",
  )
  const data = JSON.parse(raw) as { applications: DirectoryApp[] }
  const app = data.applications.find(entry => entry.appId === "IntentAppAId")
  if (!app) {
    throw new Error("IntentAppAId not found in conformance-appd.json")
  }
  return app
}

function withCatalogApps(state: AgentState, apps: DirectoryApp[]): AgentState {
  return addApplications(state, apps)
}

type FindIntentSuccessResponse = {
  type: "findIntentResponse"
  payload: {
    appIntent: {
      intent: { name: string; displayName?: string }
      apps: Array<{ appId: string; instanceId?: string }>
    }
  }
}

function getFindIntentResponse(transport: MockTransport): FindIntentSuccessResponse {
  const last = transport.getLastMessage() as FindIntentSuccessResponse
  expect(last.type).toBe("findIntentResponse")
  return last
}

describe("intent discovery metadata from app directory", () => {
  describe("createAppIntents", () => {
    const displayNameCases = [
      {
        name: "inline conformance-style intent-a fixture",
        app: intentAppA,
      },
      {
        name: "IntentAppAId from conformance-appd.json",
        app: loadConformanceIntentAppA(),
      },
    ] as const

    it.each(displayNameCases)(
      "maps directory displayName for aTestingIntent ($name)",
      ({ app }) => {
        const state = withCatalogApps(createInitialState(DEFAULT_FDC3_USER_CHANNELS), [app])

        const appIntents = createAppIntents(
          state,
          state.appDirectory,
          INTENT_APP_A_INTENT_NAME,
          TEST_CONTEXT_X,
        )

        expect(appIntents).toHaveLength(1)
        expect(appIntents[0]!.intent.name).toBe(INTENT_APP_A_INTENT_NAME)
        expect(appIntents[0]!.intent.displayName).toBe(INTENT_APP_A_DISPLAY_NAME)
      },
    )
  })

  describe("findIntentsByContext", () => {
    it("returns directory displayName for intents matching the context", () => {
      const state = withCatalogApps(createInitialState(DEFAULT_FDC3_USER_CHANNELS), [intentAppA])

      const intents = findIntentsByContext(state, state.appDirectory, TEST_CONTEXT_X)
      const testingIntent = intents.find(entry => entry.name === INTENT_APP_A_INTENT_NAME)

      expect(testingIntent).toBeDefined()
      expect(testingIntent?.displayName).toBe(INTENT_APP_A_DISPLAY_NAME)
    })
  })
})

const launchOnlyApp: DirectoryApp = {
  appId: "LaunchOnlyApp",
  title: "Launch Only App",
  type: "web",
  details: { url: "https://example.com/launch-only" },
  interop: {
    intents: {
      listensFor: {
        [INTENT_APP_A_INTENT_NAME]: {
          displayName: "Launch Only Copy",
          contexts: [TEST_CONTEXT_X],
        },
      },
    },
  },
}

describe("state-owned app directory intent discovery contract", () => {
  it("createAppIntents derives launchable apps without instanceId separately from running instances", () => {
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "running-instance",
      appId: "IntentAppAId",
      metadata: { name: "IntentAppA" },
    })
    state = updateInstanceState(state, "running-instance", AppInstanceState.CONNECTED)
    state = registerIntentListener(state, {
      listenerId: "listener-running",
      intentName: INTENT_APP_A_INTENT_NAME,
      instanceId: "running-instance",
      appId: "IntentAppAId",
      contextTypes: [],
    })

    state = withCatalogApps(state, [intentAppA, launchOnlyApp])
    const appIntents = createAppIntents(
      state,
      state.appDirectory,
      INTENT_APP_A_INTENT_NAME,
      TEST_CONTEXT_X,
    )

    expect(appIntents).toHaveLength(1)
    const apps = appIntents[0]!.apps
    expect(apps).toHaveLength(3)

    const launchableOnly = apps.find(app => app.appId === "LaunchOnlyApp")
    const directoryLaunchable = apps.find(
      app => app.appId === "IntentAppAId" && app.instanceId === undefined,
    )
    const running = apps.find(app => app.instanceId === "running-instance")

    expect(launchableOnly).toBeDefined()
    expect(launchableOnly?.instanceId).toBeUndefined()
    expect(directoryLaunchable).toBeDefined()
    expect(running).toBeDefined()
    expect(running?.appId).toBe("IntentAppAId")
  })

  it("DesktopAgent intent lookup uses state.appDirectory as the directory source", () => {
    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
      apps: [intentAppA],
    })
    let state = createInitialState(DEFAULT_FDC3_USER_CHANNELS)
    state = connectInstance(state, {
      instanceId: "a1",
      appId: "TestApp",
      metadata: { name: "TestApp" },
    })
    state = updateInstanceState(state, "a1", AppInstanceState.CONNECTED)

    state = withCatalogApps(state, agent.getState().appDirectory.apps)

    const transport = new MockTransport()
    const { params } = createDACPTestParams({ instanceId: "a1", initialState: state })
    const stateSlice = expectAppDirectoryOnState(params.getState())

    handleFindIntentRequest(
      {
        type: "findIntentRequest",
        meta: createDacpRequestMeta("find-intent-state-owned-directory"),
        payload: {
          intent: INTENT_APP_A_INTENT_NAME,
          context: { type: TEST_CONTEXT_X },
        },
      },
      withResponseDispatcher(params, transport),
    )

    const response = getFindIntentResponse(transport)
    expect(stateSlice.apps).toContainEqual(intentAppA)
    expect(response.payload.appIntent.intent.displayName).toBe(INTENT_APP_A_DISPLAY_NAME)
    expect(response.payload.appIntent.apps.every(app => app.instanceId === undefined)).toBe(true)
  })

  it("preserves duplicate appId policy for intent lookup from state.appDirectory.apps", () => {
    const duplicateVariant: DirectoryApp = {
      ...intentAppA,
      title: "Duplicate Intent App A",
    }
    const agent = new SailDesktopAgent({
      userChannels: DEFAULT_FDC3_USER_CHANNELS,
    })

    const internal = agent as unknown as { state: AgentState }
    internal.state = addApplications(internal.state, [intentAppA, duplicateVariant])

    const stateSlice = expectAppDirectoryOnState(agent.getState())
    expect(stateSlice.apps.filter(app => app.appId === "IntentAppAId")).toHaveLength(1)

    const intents = retrieveIntents(stateSlice, TEST_CONTEXT_X, INTENT_APP_A_INTENT_NAME, undefined)
    expect(intents).toHaveLength(1)
    expect(intents[0]!.appId).toBe("IntentAppAId")
  })
})
