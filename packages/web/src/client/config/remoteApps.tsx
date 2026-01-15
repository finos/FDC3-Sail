import { getClientState, RemoteApp } from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"
import { InlineButton } from "./shared"
import Combobox from "react-widgets/Combobox"
import "react-widgets/styles.css"
import { useState } from "react"

/**
 * Get all available apps that could be configured as remote apps.
 * This includes both directory apps and custom apps.
 */
function getAllAvailableApps(): DirectoryApp[] {
  const knownApps = getClientState().getKnownApps()
  return knownApps
}

/**
 * Generate a unique websocket path for a remote app
 */
function generateWebsocketPath(): string {
  return `/remote/${uuid()}`
}

/**
 * Create initial state from saved remote apps
 */
function createInitialState(): RemoteApp[] {
  return getClientState().getRemoteApps()
}

/**
 * Create a new remote app configuration
 */
function newRemoteApp(appId: string): RemoteApp {
  return {
    appId,
    websocketPath: generateWebsocketPath(),
  }
}

const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add A New Remote App</p>
    </div>
  )
}

/**
 * App selector component - allows selecting from available directory apps
 */
const AppSelector = ({
  appId,
  update,
}: {
  appId: string
  update: (appId: string) => void
}) => {
  const apps = getAllAvailableApps()
  const appOptions = apps.map((a) => ({
    appId: a.appId,
    title: a.title ?? a.name ?? a.appId,
  }))

  const currentApp = appOptions.find((a) => a.appId === appId)

  return (
    <div className={styles.appSelector}>
      <Combobox
        data={appOptions}
        textField="title"
        dataKey="appId"
        value={currentApp}
        onChange={(value) => {
          if (typeof value === "object" && value !== null) {
            update(value.appId)
          }
        }}
        filter="contains"
        placeholder="Select an application..."
      />
    </div>
  )
}

/**
 * Display the websocket connection details for a remote app
 */
const ConnectionDetails = ({ app }: { app: RemoteApp }) => {
  // Compute the full WebSocket URL based on current location
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const wsUrl = `${wsProtocol}//${window.location.host}${app.websocketPath}`

  return (
    <div className={styles.connectionDetails}>
      <div className={styles.connectionLabel}>WebSocket Path:</div>
      <div className={styles.connectionValue}>{app.websocketPath}</div>
      <div className={styles.connectionLabel}>Full WebSocket URL:</div>
      <div className={styles.connectionValue}>{wsUrl}</div>
    </div>
  )
}

/**
 * Single remote app item component
 */
const RemoteAppItem = ({
  app,
  update,
}: {
  app: RemoteApp
  update: (app: RemoteApp | null) => void
}) => {
  const allApps = getAllAvailableApps()
  const directoryApp = allApps.find((a) => a.appId === app.appId)
  const appTitle = directoryApp?.title ?? directoryApp?.name ?? app.appId

  return (
    <div key={app.websocketPath} className={styles.item}>
      <div className={styles.verticalControlsGrow}>
        <div className={styles.name}>{appTitle}</div>

        <AppSelector
          appId={app.appId}
          update={(newAppId) => {
            update({ ...app, appId: newAppId })
          }}
        />

        <ConnectionDetails app={app} />
      </div>

      <InlineButton
        onClick={() => update(null)}
        text="Remove This Remote App"
        url="/icons/control/bin.svg"
        className={styles.actionButton}
      />
    </div>
  )
}

/**
 * Main remote apps list component
 */
export const RemoteAppList = () => {
  const [apps, setApps] = useState<RemoteApp[]>(createInitialState())

  async function updateApps(newApps: RemoteApp[]): Promise<void> {
    setApps(newApps)
    return getClientState().setRemoteApps(newApps)
  }

  const availableApps = getAllAvailableApps()
  const firstAppId = availableApps.length > 0 ? availableApps[0].appId : ""

  return (
    <div className={styles.list}>
      <div className={styles.remoteAppsInfo}>
        <p>
          Remote apps allow native applications (like Java apps) to connect to
          Sail via WebSocket. Select an existing app from your directories, and
          Sail will provide a unique WebSocket endpoint for that app to connect.
        </p>
      </div>

      {apps.map((app) => (
        <RemoteAppItem
          key={app.websocketPath}
          app={app}
          update={(updatedApp) => {
            if (updatedApp) {
              const idx = apps.findIndex(
                (a) => a.websocketPath === app.websocketPath,
              )
              const newApps = [...apps]
              newApps[idx] = updatedApp
              updateApps(newApps)
            } else {
              const idx = apps.findIndex(
                (a) => a.websocketPath === app.websocketPath,
              )
              const newApps = [...apps]
              newApps.splice(idx, 1)
              updateApps(newApps)
            }
          }}
        />
      ))}

      {firstAppId ? (
        <AddButton
          onClick={() => updateApps([...apps, newRemoteApp(firstAppId)])}
        />
      ) : (
        <div className={styles.noApps}>
          <p>No apps available. Add some apps to your directories first.</p>
        </div>
      )}
    </div>
  )
}
