import { useEffect, useState } from "react"
import { Braces, ExternalLink, PanelTop, X } from "lucide-react"
import { Icon } from "../icon/icon"
import { getAppState, getServerState } from "../state"
import { useSailState } from "../state/use-sail-state"
import styles from "./styles.module.css"
import { Popup, PopupHeaderButton } from "../popups/popup"
import type { DirectoryApp, WebAppDetails } from "@finos/sail-desktop-agent"
import { getIcon } from "../icon/app-icon"
import { AppHosting } from "../state"
import type { Image } from "@finos/fdc3"

/* eslint-disable  @typescript-eslint/no-explicit-any */

type ConnectionPlatform = "java" | "csharp" | "go" | "websocket"

/**
 * Displays connection instructions for native apps that connect via WebSocket.
 * Sail will eventually need a non-WebSocket path for these apps as well.
 */
function ConnectionInstructions({ connectionUrl }: { connectionUrl: string }) {
  const [platform, setPlatform] = useState<ConnectionPlatform>("java")

  return (
    <div className={styles.connectionSection}>
      <p className={styles.connectionIntro}>
        This is a native application that connects to Sail via WebSocket. Use the connection URL
        below to configure your application.
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
              Set the <code>FDC3_WEBSOCKET_URL</code> environment variable or pass the URL to{" "}
              <code>GetAgentParams</code>:
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "csharp" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              C# FDC3 support coming soon. Connect using the WebSocket URL below.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "go" && (
          <div className={styles.platformInstructions}>
            <p className={styles.placeholder}>
              Go FDC3 support coming soon. Connect using the WebSocket URL below.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}

        {platform === "websocket" && (
          <div className={styles.platformInstructions}>
            <p>
              Connect directly via WebSocket using the FDC3 Web Connection Protocol. Send and
              receive JSON messages according to the FDC3 specification.
            </p>
            <code className={styles.connectionCode}>{connectionUrl}</code>
          </div>
        )}
      </div>
    </div>
  )
}

type AppPanelProps = { closeAction: () => void }

export function AppDPanel({ closeAction }: AppPanelProps) {
  useSailState()
  const [chosen, setChosen] = useState<DirectoryApp | null>(null)
  const [showJson, setShowJson] = useState(false)
  const apps = getServerState()
    .getKnownApps()
    .filter(d => onlyRelevantApps(d))

  const app = chosen

  useEffect(() => {
    if (!showJson) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setShowJson(false)
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [showJson])

  const canOpenWeb = chosen != null && chosen.type === "web"

  return (
    <Popup
      key="AppDPopup"
      title="App Launcher"
      variant="drawer"
      area={
        <div className={styles.appDContent}>
          <div className={styles.appDApps}>
            {apps.length === 0 ? (
              <p className={styles.appDEmpty}>
                No apps available yet. Check your directories in Settings, or wait for directories
                to finish loading.
              </p>
            ) : (
              apps.map(a => (
                <button
                  type="button"
                  key={a.appId}
                  className={`${styles.appDApp} ${a == app ? styles.selected : ""}`}
                  onClick={() => {
                    setChosen(a)
                    setShowJson(false)
                  }}
                >
                  <Icon image={getIcon(a)} text={a.title} dark={false} />
                </button>
              ))
            )}
          </div>

          <div className={styles.appDDetailContainer}>
            {app ? (
              <>
                <div className={styles.appDDetail}>
                  <div className={styles.appDInfo}>
                    <div className={styles.appDTitleRow}>
                      <h2 className={styles.appDTitle}>{app.title}</h2>
                      <div className={styles.appDActions}>
                        <PopupHeaderButton
                          text="Open"
                          primary
                          disabled={!canOpenWeb}
                          icon={<PanelTop aria-hidden strokeWidth={2} />}
                          onClick={() => {
                            void getAppState().open(chosen, AppHosting.Frame)
                            closeAction()
                          }}
                        />
                        <PopupHeaderButton
                          text="New tab"
                          disabled={!canOpenWeb}
                          icon={<ExternalLink aria-hidden strokeWidth={2} />}
                          onClick={() => {
                            void getAppState().open(chosen, AppHosting.Tab)
                            closeAction()
                          }}
                        />
                      </div>
                    </div>
                    {app.description ? (
                      <p className={styles.appDDescription}>{app.description}</p>
                    ) : null}
                    {app.categories && app.categories.length > 0 ? (
                      <div className={styles.appDKeywords}>
                        {app.categories.map((c: string) => (
                          <span key={c} className={styles.appDKeyword}>
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {app.type === "native" && (app.details as any)?.connectionUrl && (
                      <ConnectionInstructions connectionUrl={(app.details as any).connectionUrl} />
                    )}
                    {app.screenshots && app.screenshots.length > 0 ? (
                      <div className={styles.appDScreenshots}>
                        {app.screenshots.map((s: Image) => (
                          <img
                            key={s.src}
                            src={s.src}
                            alt={s.label ?? `${app.title} screenshot`}
                            title={s.label}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.jsonToggle}
                  onClick={() => setShowJson(true)}
                  title="View app directory JSON"
                  aria-label="View app directory JSON"
                >
                  <Braces className={styles.jsonToggleIcon} aria-hidden strokeWidth={2} />
                  JSON
                </button>

                {showJson ? (
                  <div className={styles.jsonOverlay} role="dialog" aria-label="App JSON">
                    <div className={styles.jsonOverlayHeader}>
                      <span className={styles.jsonOverlayTitle}>
                        <Braces className={styles.jsonToggleIcon} aria-hidden strokeWidth={2} />
                        JSON
                      </span>
                      <button
                        type="button"
                        className={styles.jsonOverlayClose}
                        onClick={() => setShowJson(false)}
                        title="Close JSON"
                        aria-label="Close JSON"
                      >
                        <X aria-hidden strokeWidth={2.25} size={16} />
                      </button>
                    </div>
                    <pre className={styles.appDJson}>{JSON.stringify(app, null, 2)}</pre>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      }
      closeAction={() => closeAction()}
    />
  )
}

function onlyRelevantApps(d: DirectoryApp): boolean {
  const sail = d.hostManifests?.sail as { [key: string]: boolean }
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 App Directory JSON: the `as` cast erases hostManifests.sail's optionality, but the source JSON can omit it
  const show = sail ? sail.searchable != false : true
  const url = (d.details as WebAppDetails).url
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 App Directory JSON: the `as WebAppDetails` cast erases url's optionality, but a "web" entry's JSON can still omit it
  return show && ((d.type == "web" && url != null) || d.type == "native")
}
