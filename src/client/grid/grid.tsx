import { Component } from "react";
import { AppPanel, ClientState } from "../state/clientState";
import * as styles from "./styles.module.css";
import "gridstack/dist/gridstack.css";
import { GridsState } from "./gridstate";
import { getAppState } from "../state/AppState";

type GridsProps = { cs: ClientState; gs: GridsState; id: string };

export class Grids extends Component<GridsProps> {
  componentDidMount(): void {
    this.componentDidUpdate();
  }

  componentDidUpdate(): void {
    this.props.gs.updatePanels();
  }

  render() {
    return (
      <div className={styles.grids} id={this.props.id}>
        {this.props.cs.getPanels().map((p) => (
          <AppFrame key={p.panelId} panel={p} />
        ))}
      </div>
    );
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
            const contentWindow = (ref as HTMLIFrameElement).contentWindow;
            getAppState().registerAppWindow(contentWindow!!, panel.panelId);
          }
        }, 10);
      }}
    />
  );
};

const LockIcon = () => {
  return (
    <img
      src="/static/icons/control/lock.svg"
      className={styles.contentTitleIcon}
      title="Lock"
    />
  );
};

const PopOutIcon = ({ action }: { action: () => void }) => {
  return (
    <img
      src="/static/icons/control/pop-out.svg"
      className={styles.contentTitleIcon}
      title="Pop Out"
      onClick={() => action()}
    />
  );
};

const CloseIcon = ({ action }: { action: () => void }) => {
  return (
    <img
      src="/static/icons/control/close.svg"
      className={styles.contentTitleIcon}
      title="Pop Out"
      onClick={() => action()}
    />
  );
};

const AppSlot = ({ panel }: { panel: AppPanel }) => {
  return (
    <div id={"app_" + panel.panelId}>
      <slot name={"slot_" + panel.panelId} />
    </div>
  );
};

export const Content = ({
  panel,
  cs,
  id,
}: {
  panel: AppPanel;
  cs: ClientState;
  id: string;
}) => {
  return (
    <div className={styles.content} id={id}>
      <div className={styles.contentInner}>
        <div className={styles.contentTitle}>
          <CloseIcon action={() => cs.removePanel(panel.panelId)} />
          <p className={styles.contentTitleText}>
            <span className={styles.contentTitleTextSpan}>{panel.title}</span>
          </p>
          <LockIcon />
          <PopOutIcon
            action={() => {
              cs.removePanel(panel.panelId);
              window.open(panel.url, "_blank");
            }}
          />
        </div>
        <div className={styles.resizeBaffle} />
        <div className={styles.contentBody}>
          {panel.url ? <AppSlot panel={panel} /> : <div />}
        </div>
      </div>
    </div>
  );
};
