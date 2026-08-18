import { DataTable, Then, When } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { contextMap, createMeta, getAppInstanceId } from "./generic.steps"
import { matchDataSubset } from "../support/testing-utils"
import { BrowserTypes } from "@finos/fdc3-schema"
import type { GetInfoRequest } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { AppInstanceState } from "../../src/state/types"
import { getInstance, getInstancesByState } from "../../src/state/selectors"
import { connectInstance, removeInstance, updateInstanceState } from "../../src/state/mutators"
import { retrieveAppsById } from "../../src/app-directory/app-directory-queries"

type OpenRequest = BrowserTypes.OpenRequest
type GetAppMetadataRequest = BrowserTypes.GetAppMetadataRequest
type FindInstancesRequest = BrowserTypes.FindInstancesRequest
type WebConnectionProtocol4ValidateAppIdentity =
  BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

/** WCP wire responses are not DACP; drop them unless a step asserts on validate output. */
function stripWcpProtocolMessagesFromLog(world: CustomWorld): void {
  world.mockTransport.allMessages = world.mockTransport.getPostedMessages().filter(record => {
    const type = record.msg.type ?? ""
    return !type.startsWith("WCP5")
  })
}

/**
 * MockTransport WCP4 → production WCP5 path. Option A: CONNECTED only after WCP5 success.
 */
async function sendWcp4ValidateForInstance(
  world: CustomWorld,
  uuid: string,
  options?: { retainWcp5InLog?: boolean },
): Promise<void> {
  const instance = getInstance(world.getState(), uuid)
  if (!instance) {
    throw new Error(`Did not find app instance ${uuid}`)
  }
  if (instance.state === AppInstanceState.CONNECTED) {
    return
  }

  const apps = retrieveAppsById(world.getState().appDirectory, instance.appId)
  const appUrl =
    apps.length > 0 &&
    apps[0]!.details &&
    typeof apps[0]!.details === "object" &&
    "url" in apps[0]!.details
      ? apps[0]!.details.url
      : `https://example.com/${instance.appId}`

  const message = {
    type: "WCP4ValidateAppIdentity",
    meta: {
      // Fixed id — do not consume the Cucumber deterministic uuid counter used by listener steps.
      connectionAttemptUuid: `wcp-attempt-${uuid}`,
      timestamp: new Date(),
    },
    payload: {
      instanceId: uuid,
      instanceUuid: uuid,
      actualUrl: appUrl,
      identityUrl: appUrl,
    },
  } as unknown as WebConnectionProtocol4ValidateAppIdentity

  // Required for bind-host WCP4 adoption of launcher-pre-registered instance ids (e.g. uuid-0).
  await world.mockTransport.receiveMessage(message, {
    sourceWindow: { hostPanel: uuid },
    messageOrigin: new URL(appUrl).origin,
  })

  const validatedId = world.mockTransport.lastWcp5ValidatedInstanceId
  if (validatedId) {
    world.mockTransport.registerWcp5Mapping(uuid, validatedId)
    if (validatedId !== uuid) {
      world.updateState(state => removeInstance(state, uuid))
    }
  }

  if (options?.retainWcp5InLog !== true) {
    stripWcpProtocolMessagesFromLog(world)
  }
}

/**
 * Connect a test instance: WCP5 via WCP4 when the app is in the directory; MockTransport-only
 * sender ids (e.g. App1) skip WCP identity lookup and mark CONNECTED directly.
 */
async function connectTestAppInstance(
  world: CustomWorld,
  appId: string,
  instanceId: string,
): Promise<void> {
  const state = world.getState()
  const existing = getInstance(state, instanceId)
  if (!existing) {
    world.updateState(currentState =>
      connectInstance(currentState, {
        instanceId,
        appId,
        metadata: {
          name: appId,
        },
      }),
    )
  }

  const inDirectory = retrieveAppsById(world.getState().appDirectory, appId).length > 0
  if (inDirectory) {
    // Background "is opened" runs WCP4 for CONNECTED state; keep WCP5 out of DACP message assertions.
    await sendWcp4ValidateForInstance(world, instanceId, { retainWcp5InLog: false })
    return
  }

  world.updateState(currentState =>
    updateInstanceState(currentState, instanceId, AppInstanceState.CONNECTED),
  )
}

/** Parse appId from Cucumber app identifier strings without consuming a deterministic uuid. */
function resolveAppIdFromAppStr(appStr: string): string {
  if (appStr.includes("appId:") && appStr.includes("instanceId:")) {
    const appIdMatch = appStr.match(/appId:\s*([^,]+)/)
    const appId = appIdMatch?.[1]?.trim()
    if (!appId) {
      throw new Error(`Invalid AppIdentifier format: ${appStr}`)
    }
    return appId
  }
  if (appStr.includes("/")) {
    return appStr.split("/")[0] ?? appStr
  }
  return appStr
}

export async function ensureAppInstanceForTesting(
  world: CustomWorld,
  appStr: string,
): Promise<string> {
  const instanceId = getAppInstanceId(world, appStr)
  const appId = resolveAppIdFromAppStr(appStr)
  await connectTestAppInstance(world, appId, instanceId)
  return instanceId
}

When(
  "{string} is opened with connection id {string}",
  async function (this: CustomWorld, app: string, uuid: string) {
    const isFirstOpen = !this.props.instances || Object.keys(this.props.instances).length === 0
    const appId = resolveAppIdFromAppStr(app)

    this.props.instances = this.props.instances || {}
    this.props.instances[app] = uuid

    // Deterministic DACP request ids (createMeta) — one tick per open; extra tick on first open
    // so the first app message after a lone open does not reuse the open connection id.
    this.createUUID()
    if (isFirstOpen) {
      this.createUUID()
    }
    await connectTestAppInstance(this, appId, uuid)
  },
)

When("{string} is closed", function (this: CustomWorld, app: string) {
  const instanceId = getAppInstanceId(this, app)
  this.desktopAgent.disconnectInstance(instanceId)
})

When("{string} sends validate", async function (this: CustomWorld, uuid: string) {
  const state = this.getState()
  let instance = getInstance(state, uuid)
  if (!instance) {
    const instanceAppIds = this.props.instanceAppIds as Record<string, string> | undefined
    const appId = instanceAppIds?.[uuid]
    if (!appId) {
      const launchHistory = this.mockAppLauncher.getLaunchHistory()
      const lastLaunch = launchHistory[launchHistory.length - 1]
      const fallbackAppId = lastLaunch?.request.app.appId
      if (!fallbackAppId) {
        throw new Error(`Did not find app instance ${uuid}`)
      }
      this.updateState(currentState =>
        connectInstance(currentState, {
          instanceId: uuid,
          appId: fallbackAppId,
          metadata: { name: fallbackAppId },
        }),
      )
    }
    if (appId) {
      this.updateState(currentState =>
        connectInstance(currentState, {
          instanceId: uuid,
          appId,
          metadata: { name: appId },
        }),
      )
    }
    instance = getInstance(this.getState(), uuid)
  }
  if (!instance) {
    throw new Error(`Did not find app instance ${uuid}`)
  }

  await sendWcp4ValidateForInstance(this, uuid, { retainWcp5InLog: true })
})

When("{string} revalidates", async function (this: CustomWorld, uuid: string) {
  const state = this.getState()
  const instance = getInstance(state, uuid)
  const appUrl = instance
    ? (() => {
        const apps = retrieveAppsById(this.getState().appDirectory, instance.appId)
        return apps.length > 0 &&
          apps[0]!.details &&
          typeof apps[0]!.details === "object" &&
          "url" in apps[0]!.details
          ? apps[0]!.details.url
          : `https://example.com/${instance.appId}`
      })()
    : `https://example.com/unknown-app/${uuid}`

  const message: WebConnectionProtocol4ValidateAppIdentity = {
    type: "WCP4ValidateAppIdentity",
    meta: {
      connectionAttemptUuid: this.createUUID(),
      timestamp: new Date(),
    },
    payload: {
      instanceId: uuid,
      instanceUuid: uuid,
      actualUrl: appUrl,
      identityUrl: appUrl,
    },
  }

  await this.mockTransport.receiveMessage(message, {
    sourceWindow: { hostPanel: uuid },
    messageOrigin: new URL(appUrl).origin,
  })
})

Then("running apps will be", function (this: CustomWorld, dataTable: DataTable) {
  const state = this.getState()
  const instances = getInstancesByState(state, AppInstanceState.CONNECTED)

  const apps = instances.map((instance: { appId: string; instanceId: string }) => ({
    appId: instance.appId,
    instanceId: instance.instanceId,
    state: "connected",
  }))

  // Background may keep auxiliary apps connected (e.g. nothingApp); assert required rows only.
  matchDataSubset(this, apps, dataTable)
})

When(
  "{string} opens app {string} [fdc3.open]",
  async function (this: CustomWorld, appStr: string, open: string) {
    await ensureAppInstanceForTesting(this, appStr)

    const from = createMeta(this, appStr)

    const message: OpenRequest = {
      type: "openRequest",
      meta: from,
      payload: {
        app: {
          appId: open,
          desktopAgent: "n/a",
        },
      },
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} opens app {string} with context data {string} [fdc3.open]",
  async function (this: CustomWorld, appStr: string, open: string, context: string) {
    await ensureAppInstanceForTesting(this, appStr)

    const from = createMeta(this, appStr)

    const message: OpenRequest = {
      type: "openRequest",
      meta: from,
      payload: {
        app: {
          appId: open,
          desktopAgent: "n/a",
        },
        context: contextMap[context],
      },
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} requests metadata for {string} [fdc3.getAppMetadata]",
  async function (this: CustomWorld, appStr: string, open: string) {
    await ensureAppInstanceForTesting(this, appStr)

    const from = createMeta(this, appStr)

    const message: GetAppMetadataRequest = {
      type: "getAppMetadataRequest",
      meta: from,
      payload: {
        app: {
          appId: open,
          desktopAgent: "n/a",
        },
      },
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} requests info on the DesktopAgent [fdc3.getInfo]",
  async function (this: CustomWorld, appStr: string) {
    await ensureAppInstanceForTesting(this, appStr)

    const from = createMeta(this, appStr)

    const message: GetInfoRequest = {
      type: "getInfoRequest",
      meta: from,
      payload: {},
    }

    await this.mockTransport.receiveMessage(message)
  },
)

When(
  "{string} findsInstances of {string} [fdc3.findInstances]",
  async function (this: CustomWorld, appStr: string, open: string) {
    await ensureAppInstanceForTesting(this, appStr)

    const from = createMeta(this, appStr)

    const message: FindInstancesRequest = {
      type: "findInstancesRequest",
      meta: from,
      payload: {
        app: {
          appId: open,
        },
      },
    }

    await this.mockTransport.receiveMessage(message)
  },
)
