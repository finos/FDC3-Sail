import { Component } from "react"
import { AppPanel, ClientState } from "../state/ClientState"
import * as styles from "./styles.module.css"
import "gridstack/dist/gridstack.css"
import { GridsState } from "./gridstate"
import { AppState, getAppState } from "../state/AppState"
import { State } from "@kite9/fdc3-web-impl"
import { AppHosting } from "../../server/da/SailServerContext"

type GridsProps = { cs: ClientState; gs: GridsState; as: AppState; id: string }

export class Grids extends Component<GridsProps> {
  componentDidMount(): void {
    this.componentDidUpdate()
  }

  componentDidUpdate(): void {
    this.props.gs.updatePanels()
  }

  render() {
    return (
      <div className={styles.grids} id={this.props.id}>
        {this.props.cs.getPanels().map((p) => (
          <AppFrame key={p.panelId} panel={p} />
        ))}
      </div>
    )
  }
}

const AppFrame = ({ panel }: { panel: AppPanel }) => {
  return (
    <iframe
      src={panel.url}
      id={"iframe_" + panel.panelId}
      name={panel.panelId}
      slot={"slot_" + panel.panelId}
      className={styles.iframe}
      ref={(ref) => {
        setTimeout(() => {
          // this is a bit hacky but we need to track the window objects
          // in the app state so we make sure we know who we're talking to
          if (ref) {
            const contentWindow = (ref as HTMLIFrameElement).contentWindow
            getAppState().registerAppWindow(contentWindow!!, panel.panelId)
          }
        }, 10)
      }}
    />
  )
}

const LockIcon = () => {
  return (
    <img
      src="/static/icons/control/lock.svg"
      className={styles.contentTitleIcon}
      title="Lock"
    />
  )
}

const AppStateIcon = ({
  instanceId,
  as,
}: {
  instanceId: string
  as: AppState
}) => {
  const D = "/static/icons/app-state/"

  function symbolForState(s: State | undefined): string[] {
    if (s == undefined) {
      return [D + "unknown.svg", "Unknown"]
    } else {
      switch (s) {
        case State.NotResponding:
          return [D + "not-responding.svg", "Not Responding"]
        case State.Connected:
          return [D + "connected.svg", "Connected to FDC3"]
        case State.Pending:
          return [D + "pending.svg", "Pending"]
        case State.Terminated:
          return [D + "terminated.svg", "Terminated"]
      }
    }
  }

  const state = symbolForState(as.getAppState(instanceId))

  return (
    <img src={state[0]} className={styles.contentTitleIcon} title={state[1]} />
  )
}
const PopOutIcon = ({ action }: { action: () => void }) => {
  return (
    <img
      src="/static/icons/control/pop-out.svg"
      className={styles.contentTitleIcon}
      title="Pop Out"
      onClick={() => action()}
    />
  )
}

const CloseIcon = ({ action }: { action: () => void }) => {
  return (
    <img
      src="/static/icons/control/close.svg"
      className={styles.contentTitleIcon}
      title="Pop Out"
      onClick={() => action()}
    />
  )
}

const AppSlot = ({ panel }: { panel: AppPanel }) => {
  return (
    <div id={"app_" + panel.panelId}>
      <slot name={"slot_" + panel.panelId} />
    </div>
  )
}

export const Content = ({
  panel,
  cs,
  as,
  id,
}: {
  panel: AppPanel
  cs: ClientState
  as: AppState
  id: string
}) => {
  return (
    <div className={styles.content} id={id}>
      <div
        className={styles.contentInner}
        style={{ border: `1px solid ${cs.getActiveTab().background}` }}
      >
        <div
          className={styles.contentTitle}
          style={{ backgroundColor: cs.getActiveTab().background }}
        >
          <CloseIcon action={() => cs.removePanel(panel.panelId)} />
          <p className={styles.contentTitleText}>
            <span className={styles.contentTitleTextSpan}>{panel.title}</span>
          </p>
          <AppStateIcon instanceId={panel.panelId} as={as} />
          {/* <LockIcon />
          <PopOutIcon
            action={() => {
              cs.removePanel(panel.panelId)
              as.open(panel.appId, AppHosting.Tab)
              window.open(panel.url, "_blank")
            }}
          /> */}
        </div>
        <div className={styles.resizeBaffle} />
        <div className={styles.contentBody}>
          {panel.url ? <AppSlot panel={panel} /> : <div />}
        </div>
      </div>
    </div>
  )
}
