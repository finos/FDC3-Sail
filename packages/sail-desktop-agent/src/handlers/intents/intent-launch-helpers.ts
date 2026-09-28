import type { Context } from "@finos/fdc3"
import { retrieveAppsById } from "../../app-directory/app-directory-queries"
import type { DACPHandlerParams } from "../types"
import {
  getInstance,
  getInstancesByAppId,
  isLaunchTargetReady,
  isInstanceReceivable,
} from "../../state/selectors"

/**
 * Launch an app and wait for it to be registered.
 *
 * Per FDC3 spec: "Allow, by default, at least a 15 second timeout for an application,
 * launched via fdc3.open, fdc3.raiseIntent or fdc3.raiseIntentForContext to add any
 * context listener (via fdc3.addContextListener) or intent listener (via fdc3.addIntentListener)
 * necessary to deliver context or intent and context to it on launch."
 *
 * Waits for any NEW instance of the app to be created and connected, rather than waiting
 * for a specific instanceId, since the Desktop Agent may create a different instanceId
 * than what the launcher returns.
 */
export async function launchAppAndWaitForInstance(
  appId: string,
  params: DACPHandlerParams,
  validatedContext: unknown,
): Promise<string> {
  const { appLauncher, getState, logger } = params

  if (!appLauncher) {
    throw new Error("App launching not available - no AppLauncher configured")
  }

  const apps = retrieveAppsById(getState().appDirectory, appId)
  if (apps.length === 0) {
    throw new Error(`App not found in directory: ${appId}`)
  }
  const appMetadata = apps[0]!

  logger.info("DACP: Launching app for intent", {
    appId,
    hasContext: !!validatedContext,
  })

  const state = getState()
  const existingInstances = getInstancesByAppId(state, appId)
  const existingInstanceIds = new Set(existingInstances.map(i => i.instanceId))

  const launchResult = await appLauncher.launch(
    {
      app: { appId },
      context: validatedContext as Context | undefined,
    },
    appMetadata,
  )

  const launcherInstanceId = launchResult.instanceId
  if (!launcherInstanceId) {
    throw new Error("App launcher did not return an instance ID")
  }

  const launchTimestamp = Date.now() - 500

  logger.info("DACP: App launched, waiting for new instance registration", {
    appId,
    launcherInstanceId,
    existingInstances: existingInstanceIds.size,
    launchTimestamp,
  })

  const maxWaitTime = 15000
  const checkInterval = 100
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    const currentState = params.getState()
    const allInstances = getInstancesByAppId(currentState, appId)
    const elapsed = Date.now() - startTime

    const shouldLog =
      elapsed < checkInterval * 2 ||
      Math.floor(elapsed / 2000) !== Math.floor((elapsed - checkInterval) / 2000)
    if (shouldLog) {
      logger.debug("DACP: Checking for new instance", {
        appId,
        elapsedMs: elapsed,
        totalInstances: allInstances.length,
        existingCount: existingInstanceIds.size,
        instances: allInstances.map(instance => ({
          instanceId: instance.instanceId,
          state: instance.state,
          createdAt: instance.createdAt.getTime(),
          isNew: !existingInstanceIds.has(instance.instanceId),
          isRecent: instance.createdAt.getTime() >= launchTimestamp,
          isReady: isLaunchTargetReady(instance, launcherInstanceId),
          matchesLauncher: instance.instanceId === launcherInstanceId,
        })),
        launcherInstanceId,
        launchTimestamp,
        currentTime: Date.now(),
      })
    }

    const newInstance = allInstances.find(instance => {
      const isNew = !existingInstanceIds.has(instance.instanceId)
      const isRecent = instance.createdAt.getTime() >= launchTimestamp
      const isReady = isLaunchTargetReady(instance, launcherInstanceId)

      if (isNew && isRecent && !isReady) {
        logger.debug("DACP: Found new instance but not ready yet", {
          instanceId: instance.instanceId,
          state: instance.state,
          createdAt: instance.createdAt.getTime(),
          launchTimestamp,
        })
      }

      return isNew && isRecent && isReady
    })

    if (newInstance) {
      logger.info("DACP: New app instance registered and ready", {
        appId,
        instanceId: newInstance.instanceId,
        launcherInstanceId,
        state: newInstance.state,
        elapsedMs: Date.now() - startTime,
      })
      return newInstance.instanceId
    }

    const launcherInstance = getInstance(currentState, launcherInstanceId)
    if (launcherInstance && isInstanceReceivable(launcherInstance)) {
      logger.info("DACP: Launcher instance registered and ready", {
        appId,
        instanceId: launcherInstanceId,
        state: launcherInstance.state,
      })
      return launcherInstanceId
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  const finalState = params.getState()
  const finalInstances = getInstancesByAppId(finalState, appId)
  logger.error("DACP: Timeout waiting for new instance", {
    appId,
    launcherInstanceId,
    existingInstancesBeforeLaunch: existingInstanceIds.size,
    currentInstances: finalInstances.length,
    currentInstanceStates: finalInstances.map(i => ({
      instanceId: i.instanceId,
      state: i.state,
      createdAt: i.createdAt.getTime(),
      launchTimestamp,
    })),
  })

  throw new Error(
    `No new instance of app ${appId} registered and connected within ${maxWaitTime}ms (FDC3 spec minimum timeout)`,
  )
}
