import { useEffect, useLayoutEffect, useState } from "react"
import {
  getAppState,
  getClientState,
  WscpPairing,
} from "@finos/fdc3-sail-common"
import { DirectoryApp, State } from "@finos/fdc3-sail-da-impl"
import { Icon } from "../icon/icon"
import { DEFAULT_ICON } from "../appd/appd"
import styles from "./styles.module.css"

function isPairingInUse(instanceId: string): boolean {
  const state = getAppState().getAppState(instanceId)
  return state !== undefined && state !== State.Terminated
}

function getAppForPairing(appId: string): DirectoryApp | undefined {
  return getClientState()
    .getKnownApps()
    .find((a) => a.appId === appId)
}

function connectionStatus(instanceId: string): {
  label: string
  className: string
} {
  const state = getAppState().getAppState(instanceId)
  if (state === undefined) {
    return { label: "Not connected", className: styles.statusDisconnected }
  }
  switch (state) {
    case State.Connected:
      return { label: "Connected", className: styles.statusConnected }
    case State.Pending:
      return { label: "Pending", className: styles.statusPending }
    case State.NotResponding:
      return { label: "Not responding", className: styles.statusWarning }
    case State.Terminated:
      return { label: "Terminated", className: styles.statusDisconnected }
    default:
      return { label: String(state), className: styles.statusDisconnected }
  }
}

function PairingRow({ pairing }: { pairing: WscpPairing }) {
  const app = getAppForPairing(pairing.appId)
  const status = connectionStatus(pairing.instanceId)
  const iconUrl = app?.icons?.[0]?.src ?? DEFAULT_ICON

  return (
    <div className={styles.pairingCard}>
      <Icon image={iconUrl} text={app?.title ?? pairing.appId} dark={false} />
      <div className={styles.pairingDetails}>
        <div className={styles.pairingHeader}>
          <span className={styles.pairingTitle}>
            {app?.title ?? pairing.appId}
          </span>
          <span className={`${styles.statusBadge} ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className={styles.pairingField}>
          <span className={styles.fieldLabel}>App ID</span>
          <code className={styles.pairingValue}>{pairing.appId}</code>
        </div>
        <div className={styles.pairingField}>
          <span className={styles.fieldLabel}>Instance ID</span>
          <code className={styles.pairingValue}>{pairing.instanceId}</code>
        </div>
        <div className={styles.pairingField}>
          <span className={styles.fieldLabel}>Shared secret</span>
          <code className={styles.pairingSecret}>{pairing.sharedSecret}</code>
        </div>
      </div>
    </div>
  )
}

export function WscpPairingList() {
  const [, refresh] = useState(0)

  useLayoutEffect(() => {
    const all = getClientState().getWscpPairings()
    const toRemove = all
      .filter((pairing) => !isPairingInUse(pairing.instanceId))
      .map((pairing) => pairing.instanceId)
    if (toRemove.length > 50) {
      getClientState()
        .removeWscpPairings(toRemove)
        .then(() => refresh((n) => n + 1))
        .catch((error: unknown) => {
          console.error("Failed to auto-remove excess WSCP pairings", error)
        })
    }
  }, [])

  useEffect(() => {
    const onChange = () => refresh((n) => n + 1)
    getClientState().addStateChangeCallback(onChange)
    getAppState().addStateChangeCallback(onChange)
  }, [])

  const allPairings = getClientState().getWscpPairings()
  const inUsePairings = allPairings.filter((pairing) =>
    isPairingInUse(pairing.instanceId),
  )
  const unusedCount = allPairings.length - inUsePairings.length
  const pairings = allPairings.length > 200 ? inUsePairings : allPairings
  const truncated = allPairings.length > 200

  const clearUnused = () => {
    const toRemove = allPairings
      .filter((pairing) => !isPairingInUse(pairing.instanceId))
      .map((pairing) => pairing.instanceId)
    getClientState()
      .removeWscpPairings(toRemove)
      .catch((error: unknown) => {
        console.error("Failed to remove unused WSCP pairings", error)
      })
  }

  if (allPairings.length === 0) {
    return (
      <p className={styles.pairingEmpty}>
        No remote app pairings yet. Pairings are created when you open
        connection instructions for a native app in the App Directory.
      </p>
    )
  }

  return (
    <div className={styles.pairingList}>
      <div className={styles.pairingToolbar}>
        <p className={styles.pairingIntro}>
          WSCP shared secrets currently in circulation. Each secret binds one
          native app instance to Sail.
        </p>
        {unusedCount > 0 && (
          <button
            type="button"
            className={styles.clearUnusedButton}
            onClick={clearUnused}
          >
            Clear {unusedCount.toLocaleString()} unused
          </button>
        )}
      </div>
      {truncated && (
        <p className={styles.pairingWarning}>
          Showing {pairings.length.toLocaleString()} connected pairings only —
          clear {unusedCount.toLocaleString()} unused to see the full list.
        </p>
      )}
      {pairings.map((pairing) => (
        <PairingRow key={pairing.instanceId} pairing={pairing} />
      ))}
    </div>
  )
}
