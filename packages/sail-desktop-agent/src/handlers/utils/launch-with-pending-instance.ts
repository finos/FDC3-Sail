import type { AppIdentifier, BrowserTypes } from "@finos/fdc3"
import type { AppLauncher } from "../../host-contracts/app-launcher"
import type { DirectoryApp } from "../../app-directory/types"
import { AppInstanceState, type AgentState, type StateSetter } from "../../state/types"
import { getInstance } from "../../state/selectors"
import { connectInstance, removeInstance } from "../../state/mutators"

/**
 * Launch through the host {@link AppLauncher} with the instance already registered as PENDING.
 *
 * The browsing context can send WCP1 before `launch()` resolves. Minting the id first and passing
 * it as `request.app.instanceId` lets WCP4 adopt it, so the id `open()` returns is the id the app
 * connects as. A launcher that returns its own id gets that id registered instead, and a launch
 * that throws leaves nothing behind.
 */
export async function launchWithPendingInstance(params: {
  appLauncher: AppLauncher
  request: BrowserTypes.OpenRequestPayload
  app: DirectoryApp
  getState: () => AgentState
  setState: StateSetter
}): Promise<AppIdentifier & { instanceId: string }> {
  const { appLauncher, request, app, getState, setState } = params
  const requestedInstanceId = request.app.instanceId ?? crypto.randomUUID()
  const mintedHere = !getInstance(getState(), requestedInstanceId)

  const registerPending = (instanceId: string) => {
    if (getInstance(getState(), instanceId)) {
      return
    }
    setState(state =>
      connectInstance(state, {
        instanceId,
        appId: app.appId,
        metadata: {
          name: app.name,
          title: app.title,
          description: app.description,
          icons: app.icons,
          screenshots: app.screenshots,
        },
      }),
    )
  }
  // Only an id this call minted, and only while nothing has connected as it.
  const dropMinted = () => {
    if (
      mintedHere &&
      getInstance(getState(), requestedInstanceId)?.state === AppInstanceState.PENDING
    ) {
      setState(state => removeInstance(state, requestedInstanceId))
    }
  }

  registerPending(requestedInstanceId)

  let launched: AppIdentifier
  try {
    launched = await appLauncher.launch(
      { ...request, app: { ...request.app, instanceId: requestedInstanceId } },
      app,
    )
  } catch (error) {
    dropMinted()
    throw error
  }

  const launchedInstanceId = launched.instanceId
  if (!launchedInstanceId) {
    dropMinted()
    throw new Error("App launcher did not return an instanceId")
  }

  if (launchedInstanceId !== requestedInstanceId) {
    dropMinted()
    registerPending(launchedInstanceId)
  }

  return { ...launched, instanceId: launchedInstanceId }
}
