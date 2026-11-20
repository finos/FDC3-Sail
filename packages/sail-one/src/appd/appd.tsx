import { useEffect, useState } from "react"
import { Braces, ExternalLink, PanelTop, X } from "lucide-react"
import { Icon } from "../icon/icon"
import { getAppState, getCatalog } from "../state"
import { useSailState } from "../state/use-sail-state"
import styles from "./styles.module.css"
import { Popup, PopupHeaderButton } from "../popups/popup"
import { getIcon } from "../icon/app-icon"
import { AppHosting } from "../state"
import type { SailApp, SailWebApp } from "@finos/sail-platform"

type AppPanelProps = { closeAction: () => void }

function isWebApp(app: SailApp): app is SailWebApp {
  return typeof (app as SailWebApp).url === "string" && (app as SailWebApp).url.length > 0
}

export function AppDPanel({ closeAction }: AppPanelProps) {
  useSailState()
  const [chosen, setChosen] = useState<SailApp | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [apps, setApps] = useState<SailWebApp[]>([])

  const app = chosen

  useEffect(() => {
    let cancelled = false
    void getCatalog()
      .list()
      .then(list => {
        if (!cancelled) {
          setApps(list.filter((a): a is SailWebApp => isWebApp(a) && !a.hidden))
        }
      })
      .catch((err: unknown) => {
        console.error("[Sail] Failed to load catalog apps", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const canOpenWeb = chosen != null && isWebApp(chosen)

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
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.jsonToggle}
                  onClick={() => setShowJson(true)}
                  title="View app JSON"
                  aria-label="View app JSON"
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
