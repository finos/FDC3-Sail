import { Component, useEffect, useRef, useState } from "react"
import { Icon } from "../icon/icon"
import {
  getAppState,
  getClientState,
  FDC3_WEBSOCKET_PROPERTY,
  WscpPairing,
} from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { Popup, PopupButton } from "../popups/popup"
import { DirectoryApp, State, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { AppHosting } from "@finos/fdc3-sail-common"
import { AppMetadata, Image } from "@finos/fdc3"

/* eslint-disable  @typescript-eslint/no-explicit-any */

type ConnectionPlatform = "java" | "csharp" | "go" | "websocket"

function PairingCredentials({
  pairing,
  connectionUrl,
}: {
  pairing: WscpPairing
  connectionUrl: string
}) {
  return (
    <div className={styles.connectionCredentials}>
      <p>
        <strong>WebSocket URL</strong>
      </p>
      <code className={styles.connectionCode}>{connectionUrl}</code>
      <p>
        <strong>Shared secret</strong> (for the next connection — one per app
        instance)
      </p>
      <code className={styles.connectionCode}>{pairing.sharedSecret}</code>
      <p>
        <strong>Instance ID</strong> (assigned by Sail after connect)
      </p>
      <code className={styles.connectionCode}>{pairing.instanceId}</code>
    </div>
  )
}

function isPairingInUse(instanceId: string): boolean {
  const state = getAppState().getAppState(instanceId)
  return state !== undefined && state !== State.Terminated
}

async function ensureNextUnusedPairing(appId: string): Promise<WscpPairing> {
  const forApp = getClientState().getWscpPairingsForApp(appId)
  const unused = [...forApp]
    .reverse()
    .find((pairing) => !isPairingInUse(pairing.instanceId))
  if (unused) {
    return unused
  }
  return getClientState().mintWscpPairing(appId)
}

async function pruneUnusedPairings(
  appId: string,
  keepInstanceId: string,
): Promise<void> {
  const toRemove = getClientState()
    .getWscpPairingsForApp(appId)
    .filter(
      (pairing) =>
        pairing.instanceId !== keepInstanceId &&
        !isPairingInUse(pairing.instanceId),
    )
    .map((pairing) => pairing.instanceId)
  await getClientState().removeWscpPairings(toRemove)
}

/**
 * Displays connection instructions for native apps with tabs for different platforms.
 */
function ConnectionInstructions({
  appId,
  connectionUrl,
}: {
  appId: string
  connectionUrl: string
}) {
  const [platform, setPlatform] = useState<ConnectionPlatform>("java")
  const [displayPairing, setDisplayPairing] = useState<WscpPairing | null>(null)
  const displayPairingRef = useRef<WscpPairing | null>(null)
  const wasInUseRef = useRef(false)
  const mintInFlightRef = useRef(false)

  const setPairing = (pairing: WscpPairing | null) => {
    displayPairingRef.current = pairing
    wasInUseRef.current = pairing ? isPairingInUse(pairing.instanceId) : false
    setDisplayPairing(pairing)
  }

  useEffect(() => {
    let cancelled = false
    ensureNextUnusedPairing(appId)
      .then(async (pairing) => {
        if (cancelled) {
          return
        }
        await pruneUnusedPairings(appId, pairing.instanceId)
        if (!cancelled) {
          setPairing(pairing)
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to ensure WSCP pairing", error)
      })
    return () => {
      cancelled = true
    }
  }, [appId])

  useEffect(() => {
    const rotateAfterConnect = () => {
      const current = displayPairingRef.current
      if (!current || mintInFlightRef.current) {
        return
      }

      const inUse = isPairingInUse(current.instanceId)
      if (inUse && !wasInUseRef.current) {
        mintInFlightRef.current = true
        getClientState()
          .mintWscpPairing(appId)
          .then((pairing) => {
            setPairing(pairing)
            return pruneUnusedPairings(appId, pairing.instanceId)
          })
          .catch((error: unknown) => {
            console.error("Failed to mint next WSCP pairing", error)
          })
          .finally(() => {
            mintInFlightRef.current = false
          })
      }
      wasInUseRef.current = inUse
    }
    getAppState().addStateChangeCallback(rotateAfterConnect)
  }, [appId])

  const createPairing = () => {
    getClientState()
      .mintWscpPairing(appId)
      .then(setPairing)
      .catch((error: unknown) => {
        console.error("Failed to mint WSCP pairing", error)
      })
  }

  return (
    <div className={styles.connectionSection}>
      <p className={styles.connectionIntro}>
        This native application connects to Sail via WSCP. Each running copy
        needs its own pairing credentials. The credentials below are for the
        next connection — when an app connects, a fresh set is shown
        automatically so you can launch another instance. All pairings are
        stored in this browser and synced to Sail.
      </p>

      <button
        type="button"
        className={styles.platformTab}
        onClick={createPairing}
      >
        New credentials
      </button>

      {displayPairing && (
        <PairingCredentials
          pairing={displayPairing}
          connectionUrl={connectionUrl}
        />
      )}

      <div className={styles.platformTabs}>
        <button
          className={`${styles.platformTab} ${platform === "java" ? styles.activePlatformTab : ""}`}
          onClick={() => setPlatform("java")}
        >
          Java
        </button>
        <button
          className={`${styles.platformTab} ${platform === "csharp" ? styles.activePlatformTab : ""}`}
          onClick={() => setPlatform("csharp")}
        >
          C#
        </button>
        <button
          className={`${styles.platformTab} ${platform === "go" ? styles.activePlatformTab : ""}`}
          onClick={() => setPlatform("go")}
        >
          Go
        </button>
        <button
          className={`${styles.platformTab} ${platform === "websocket" ? styles.activePlatformTab : ""}`}
          onClick={() => setPlatform("websocket")}
        >
          WebSocket
        </button>
      </div>

      <div className={styles.platformContent}>
        {platform === "java" && (
          <div className={styles.platformInstructions}>
            <p>
              Pass <code>webSocketUrl</code> and <code>sharedSecret</code> to
              your app launch handler or <code>GetAgentParams</code>.
            </p>
          </div>
        )}

        {platform === "csharp" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              C# FDC3 support coming soon. Use the pairing credentials above.
            </p>
          </div>
        )}

        {platform === "go" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              Go FDC3 support coming soon. Use the pairing credentials above.
            </p>
          </div>
        )}

        {platform === "websocket" && (
          <div className={styles.platformInstructions}>
            <p>
              Open a WebSocket to the URL above, send
              <code> WSCPApplicationConnect</code> with the shared secret, then
              exchange DACP messages after <code>WSCPDesktopAgentConnect</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export const DEFAULT_ICON = "/icons/control/choose-app.svg"

export function getIcon(a: DirectoryApp | AppMetadata | undefined): string {
  if (a) {
    const icons = a.icons ?? []
    if (icons.length > 0) {
      return icons[0].src
    }
  }

  return DEFAULT_ICON
}

type AppPanelProps = { closeAction: () => void }

type DetailTab = "info" | "screenshots" | "json"

type AppPanelState = {
  chosen: DirectoryApp | null
  apps: DirectoryApp[]
  activeTab: DetailTab
}

export class AppDPanel extends Component<AppPanelProps, AppPanelState> {
  constructor(props: AppPanelProps) {
    super(props)
    this.state = {
      chosen: null,
      apps: getClientState()
        .getKnownApps()
        .filter((d) => onlyRelevantApps(d)),
      activeTab: "info",
    }
  }

  setChosen(app: DirectoryApp) {
    this.setState({
      ...this.state,
      chosen: app,
    })
  }

  setActiveTab(tab: DetailTab) {
    this.setState({
      ...this.state,
      activeTab: tab,
    })
  }

  render() {
    const app: DirectoryApp = this.state.chosen!

    return (
      <Popup
        key="AppDPopup"
        title="Start Application"
        area={
          <div className={styles.appDContent}>
            <div className={styles.appDApps}>
              {this.state.apps.map((a) => (
                <div
                  key={a.appId}
                  className={`${styles.appDApp} ${a == app ? styles.selected : ""}`}
                  onClick={() => this.setChosen(a)}
                >
                  <Icon image={getIcon(a)} text={a.title} dark={false} />
                </div>
              ))}
            </div>

            <div className={styles.appDDetailContainer}>
              {app ? (
                <>
                  <div className={styles.tabBar}>
                    <button
                      className={`${styles.tab} ${this.state.activeTab === "info" ? styles.activeTab : ""}`}
                      onClick={() => this.setActiveTab("info")}
                    >
                      Info
                    </button>
                    <button
                      className={`${styles.tab} ${this.state.activeTab === "screenshots" ? styles.activeTab : ""}`}
                      onClick={() => this.setActiveTab("screenshots")}
                    >
                      Screenshots
                    </button>
                    <button
                      className={`${styles.tab} ${this.state.activeTab === "json" ? styles.activeTab : ""}`}
                      onClick={() => this.setActiveTab("json")}
                    >
                      JSON
                    </button>
                  </div>
                  <div className={styles.appDDetail}>
                    {this.state.activeTab === "info" && (
                      <div className={styles.appDInfo}>
                        <h2>{app.title}</h2>
                        <p>{app.description}</p>
                        <ul>
                          {app.categories?.map((c: string) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                        {app.type === "native" &&
                          (app.details as any)?.[FDC3_WEBSOCKET_PROPERTY] && (
                            <ConnectionInstructions
                              appId={app.appId!}
                              connectionUrl={
                                (app.details as any)[FDC3_WEBSOCKET_PROPERTY]
                              }
                            />
                          )}
                      </div>
                    )}
                    {this.state.activeTab === "screenshots" && (
                      <div className={styles.appDScreenshots}>
                        {app.screenshots && app.screenshots.length > 0 ? (
                          app.screenshots.map((s: Image) => (
                            <img key={s.src} src={s.src} title={s.label} />
                          ))
                        ) : (
                          <p className={styles.noScreenshots}>
                            No screenshots available
                          </p>
                        )}
                      </div>
                    )}
                    {this.state.activeTab === "json" && (
                      <div className={styles.appDJson}>
                        <pre>{JSON.stringify(app, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        }
        buttons={[
          <PopupButton
            key="open-frame"
            text="Open Here"
            disabled={
              this.state.chosen == null || this.state.chosen.type !== "web"
            }
            onClick={async () => {
              if (this.state.chosen) {
                getAppState().open(this.state.chosen, AppHosting.Frame)
                this.props.closeAction()
              }
            }}
          />,
          <PopupButton
            key="open-tab"
            text="Open In Tab"
            disabled={
              this.state.chosen == null || this.state.chosen.type !== "web"
            }
            onClick={async () => {
              if (this.state.chosen) {
                getAppState().open(this.state.chosen, AppHosting.Tab)
                this.props.closeAction()
              }
            }}
          />,
        ]}
        closeAction={() => this.props.closeAction()}
        closeName="Cancel"
      />
    )
  }
}
function onlyRelevantApps(d: DirectoryApp): boolean {
  const sail = d.hostManifests?.sail as { [key: string]: boolean }
  const show = sail ? sail.searchable != false : true
  const url = (d.details as WebAppDetails).url
  return show && ((d.type == "web" && url != null) || d.type == "native")
}
