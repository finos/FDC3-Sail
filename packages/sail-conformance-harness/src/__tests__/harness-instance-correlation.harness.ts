import { expect } from "vite-plus/test"
import { type Logger } from "@finos/sail-desktop-agent"
import { createDesktopAgentWithTestConnection } from "../../../sail-desktop-agent/test/support/desktop-agent-test-harness"
import type { DacpTestAppConnection } from "../../../sail-desktop-agent/test/support/dacp-test-app-connection"
import { createHarnessAppLauncher } from "../app-launcher"
import type { HarnessPanel } from "../types"

/** Expected harness debug log prefix once Phase 1 correlation logging lands. */
export const HARNESS_CORRELATION_LOG_TAG = "[ConformanceHarness] instance-identity-correlation"

export type InstanceIdentityCorrelationSnapshot = {
  launcherInstanceId: string
  iframeName: string
  wcp5InstanceId: string
  findInstancesInstanceIds: string[]
}

export type HarnessCorrelationRunOptions = {
  logger?: Logger
  logPayloadDetail?: "metadata" | "full"
}

/**
 * Phase 1 spike fixture: harness AppLauncher open → iframe name → WCP4/WCP5 → findInstances.
 * Uses public DesktopAgent APIs and the same DACP message shapes as Cucumber steps.
 */
export async function runHarnessOpenAndWcpHandshake(
  options: HarnessCorrelationRunOptions = {},
): Promise<InstanceIdentityCorrelationSnapshot> {
  const appId = "ChartApp"
  const appUrl = "https://example.com/chart-app"
  const callerConnectionId = "conformance1-caller"

  const panels: HarnessPanel[] = []
  const appLauncher = createHarnessAppLauncher(panel => {
    panels.push(panel)
  })

  const { connection } = createDesktopAgentWithTestConnection({
    apps: [
      {
        appId,
        title: "Chart App",
        type: "web",
        details: { url: appUrl },
      },
      {
        appId: "Conformance1",
        title: "Conformance Framework",
        type: "web",
        details: { url: "https://example.com/conformance1" },
      },
    ],
    appLauncher,
    logger: options.logger,
    logPayloadDetail: options.logPayloadDetail ?? "full",
  })
  const transport = connection.outbound

  const callerValidatedId = await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "caller-connect",
    appUrl: "https://example.com/conformance1",
    claimedInstanceId: callerConnectionId,
  })

  transport.clear()

  const openRequestUuid = crypto.randomUUID()
  await connection.receiveMessage({
    type: "openRequest",
    meta: {
      requestUuid: openRequestUuid,
      timestamp: new Date(),
      source: {
        appId: "Conformance1",
        instanceId: callerValidatedId,
      },
    },
    payload: {
      app: {
        appId,
        desktopAgent: "n/a",
      },
    },
  })

  // A plain `fdc3.open()` resolves only once the launched app has connected, so the launcher has
  // mounted the browsing context but the caller has no answer yet.
  expect(
    transport.allMessages
      .map(record => record.msg)
      .filter(message => message.type === "openResponse"),
    "plain open() must not answer before the launched app has completed WCP4",
  ).toEqual([])

  const launchedPanel = panels.find(panel => panel.appId === appId)
  expect(launchedPanel).toBeDefined()
  const iframeName = launchedPanel!.instanceId

  const wcp5InstanceId = await completeWcp4Handshake(connection, {
    connectionAttemptUuid: "launched-app-connect",
    appUrl,
    claimedInstanceId: iframeName,
  })

  // Now the open can be answered — correlated to its own request so it can never be confused
  // with another caller's response.
  const openResponse = transport.allMessages
    .map(record => record.msg)
    .find(
      message => message.type === "openResponse" && message.meta?.requestUuid === openRequestUuid,
    ) as
    | {
        type: "openResponse"
        payload?: { error?: string; appIdentifier?: { instanceId?: string } }
      }
    | undefined
  expect(openResponse, `no openResponse for openRequest ${openRequestUuid}`).toBeDefined()
  expect(openResponse?.payload?.error).toBeUndefined()
  const launcherInstanceId = openResponse?.payload?.appIdentifier?.instanceId
  expect(launcherInstanceId).toBeDefined()
  expect(iframeName).toBe(launcherInstanceId)

  transport.clear()

  await connection.receiveMessage({
    type: "findInstancesRequest",
    meta: {
      requestUuid: crypto.randomUUID(),
      timestamp: new Date(),
      source: {
        appId: "Conformance1",
        instanceId: callerValidatedId,
      },
    },
    payload: {
      app: {
        appId,
        desktopAgent: "n/a",
      },
    },
  })

  const findInstancesResponse = transport.allMessages
    .map(record => record.msg)
    .find(message => message.type === "findInstancesResponse") as
    | {
        type: "findInstancesResponse"
        payload?: { appIdentifiers?: Array<{ instanceId?: string }> }
      }
    | undefined
  expect(findInstancesResponse?.type).toBe("findInstancesResponse")
  const findInstancesInstanceIds =
    findInstancesResponse?.payload?.appIdentifiers
      ?.map(identifier => identifier.instanceId)
      .filter((id): id is string => typeof id === "string") ?? []

  const snapshot: InstanceIdentityCorrelationSnapshot = {
    launcherInstanceId: launcherInstanceId!,
    iframeName,
    wcp5InstanceId,
    findInstancesInstanceIds,
  }

  // Emit harness correlation log when a logger is wired (e.g. logPayloadDetail: 'full').
  if (options.logger) {
    options.logger.debug(HARNESS_CORRELATION_LOG_TAG, snapshot)
  }

  return snapshot
}

function readWcp5InstanceId(connection: DacpTestAppConnection): string {
  const transport = connection.outbound
  const wcp5 = transport.allMessages
    .map(record => record.msg)
    .find(message => message.type === "WCP5ValidateAppIdentityResponse") as
    | { payload?: { instanceId?: string } }
    | undefined

  const fromPayload = wcp5?.payload?.instanceId
  if (fromPayload) {
    return fromPayload
  }

  expect(transport.lastWcp5ValidatedInstanceId).toBeDefined()
  return transport.lastWcp5ValidatedInstanceId!
}

async function completeWcp4Handshake(
  connection: DacpTestAppConnection,
  params: {
    connectionAttemptUuid: string
    appUrl: string
    claimedInstanceId: string
  },
): Promise<string> {
  await connection.receiveMessage(
    {
      type: "WCP4ValidateAppIdentity",
      meta: {
        connectionAttemptUuid: params.connectionAttemptUuid,
        timestamp: new Date().toISOString(),
      },
      payload: {
        instanceId: params.claimedInstanceId,
        instanceUuid: params.claimedInstanceId,
        identityUrl: params.appUrl,
        actualUrl: params.appUrl,
      },
    },
    { messageOrigin: new URL(params.appUrl).origin },
  )

  return readWcp5InstanceId(connection)
}

/**
 * Phase 1 spike assertions: launcher id, iframe name, WCP5 id, and findInstances align
 * when openRequest pre-registers the host-assigned instance before WCP4 completes.
 */
export function assertInstanceIdentityCorrelated(
  snapshot: InstanceIdentityCorrelationSnapshot,
): void {
  const { launcherInstanceId, iframeName, wcp5InstanceId, findInstancesInstanceIds } = snapshot

  expect(launcherInstanceId).toBeTruthy()
  expect(iframeName).toBeTruthy()
  expect(wcp5InstanceId).toBeTruthy()

  // Harness contract: iframe name mirrors AppLauncher.instanceId at open time.
  expect(iframeName).toBe(launcherInstanceId)

  // Host pre-register (openRequest / prepareLaunchedHostInstance) keeps launcher id through WCP5.
  expect(wcp5InstanceId).toBe(launcherInstanceId)

  // findInstances() lists the validated WCP5-registered instance (same id as launcher).
  expect(findInstancesInstanceIds).toEqual(expect.arrayContaining([wcp5InstanceId]))
}

export function findHarnessCorrelationLog(
  lines: string[],
): InstanceIdentityCorrelationSnapshot | undefined {
  const line = lines.find(entry => entry.includes(HARNESS_CORRELATION_LOG_TAG))
  if (!line) {
    return undefined
  }

  const jsonStart = line.indexOf("{")
  if (jsonStart === -1) {
    return undefined
  }

  try {
    return JSON.parse(line.slice(jsonStart)) as InstanceIdentityCorrelationSnapshot
  } catch {
    return undefined
  }
}
