import { Component, useState } from "react"
import { Icon } from "../icon/icon"
import {
  getAppState,
  getClientState,
  FDC3_WEBSOCKET_PROPERTY,
} from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { Popup, PopupButton } from "../popups/popup"
import { DirectoryApp, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { AppHosting } from "@finos/fdc3-sail-common"
import { AppMetadata, Image } from "@finos/fdc3"

/* eslint-disable  @typescript-eslint/no-explicit-any */

type ConnectionPlatform = "java" | "csharp" | "go" | "websocket"

/**
 * Displays connection instructions for native apps with tabs for different platforms.
 */
function ConnectionInstructions({ connectionUrl }: { connectionUrl: string }) {
  const [platform, setPlatform] = useState<ConnectionPlatform>("java")

  return (
    <div className={styles.connectionSection}>
      <p className={styles.connectionIntro}>
        This is a native application that connects to Sail via WebSocket. Use
        the connection URL below to configure your application.
      </p>

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
              Set the <code>FDC3_WEBSOCKET_URL</code> environment variable or
              pass the URL to <code>GetAgentParams</code>:
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "csharp" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              C# FDC3 support coming soon. Connect using the WebSocket URL
              below.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "go" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              Go FDC3 support coming soon. Connect using the WebSocket URL
              below.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "websocket" && (
          <div className={styles.platformInstructions}>
            <p>
              Connect directly via WebSocket using the FDC3 Web Connection
              Protocol. Send and receive JSON messages according to the FDC3
              specification.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
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
