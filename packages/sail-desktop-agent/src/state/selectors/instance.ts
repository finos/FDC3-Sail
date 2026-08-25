/**
 * Instance Selectors
 *
 * Pure functions for querying instance-related state.
 */

import type { AgentState, AppInstance, InstanceContextListener } from "../types"
import { AppInstanceState } from "../types"

export const getInstance = (state: AgentState, instanceId: string): AppInstance | undefined =>
  state.instances[instanceId]

export const getAllInstances = (state: AgentState): AppInstance[] => Object.values(state.instances)

export const getInstancesByAppId = (state: AgentState, appId: string): AppInstance[] =>
  Object.values(state.instances).filter(i => i.appId === appId)

export const instanceContextListenerMatchesBroadcast = (
  listener: InstanceContextListener,
  broadcastContextType: string,
): boolean => listener.contextType === broadcastContextType || listener.contextType === "*"

/** WCP5 complete: the instance can be sent DACP messages right now. */
export const isInstanceConnected = (instance: AppInstance): boolean =>
  instance.state === AppInstanceState.CONNECTED

/**
 * Not gone: CONNECTED, or PENDING mid-handshake.
 *
 * `AppInstanceState` only has PENDING/CONNECTED today (browserResidentDesktopAgents.md v2.2
 * "Disconnects": Sail's `removeInstance` deletes closed instances rather than retaining a
 * CLOSED state), which makes this check a tautology right now. A retained CLOSED state is
 * planned; once it ships this becomes load bearing. Deleting it now fails OPEN — an instance
 * that has actually gone away would still read as receivable.
 */
export const isInstanceReceivable = (instance: AppInstance): boolean =>
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- see doc comment above: AppInstanceState only has PENDING/CONNECTED today, so this is a tautology until the planned CLOSED state ships; deleting it now fails OPEN.
  instance.state === AppInstanceState.CONNECTED || instance.state === AppInstanceState.PENDING

/** Valid target for a launch this agent initiated: connected, or the launcher itself mid-handshake. */
export const isLaunchTargetReady = (instance: AppInstance, launcherInstanceId: string): boolean =>
  isInstanceConnected(instance) ||
  (instance.state === AppInstanceState.PENDING && instance.instanceId === launcherInstanceId)

export const getConnectedInstances = (state: AgentState): AppInstance[] =>
  Object.values(state.instances).filter(isInstanceConnected)

export const getInstancesByState = (
  state: AgentState,
  instanceState: AppInstanceState | AppInstanceState[],
): AppInstance[] => {
  const states = Array.isArray(instanceState) ? instanceState : [instanceState]
  return Object.values(state.instances).filter(i => states.includes(i.state))
}

export const getInstancesWithContextListener = (
  state: AgentState,
  contextType: string,
): AppInstance[] =>
  Object.values(state.instances).filter(instance =>
    Object.values(instance.contextListeners).some(listener =>
      instanceContextListenerMatchesBroadcast(listener, contextType),
    ),
  )

export const getInstancesWithPrivateChannel = (
  state: AgentState,
  channelId: string,
): AppInstance[] =>
  Object.values(state.instances).filter(i => i.privateChannels.includes(channelId))
