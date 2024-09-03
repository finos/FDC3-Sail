import { Component } from "react";
import { AppPanel, ClientState } from "../state/client";
import * as styles from "./styles.module.css";
import "gridstack/dist/gridstack.css";
import { GridsState } from "./gridstate";

type GridsProps = { cs: ClientState; gs: GridsState; id: string };

export class Grids extends Component<GridsProps> {
  componentDidMount(): void {
    console.log("CDM");
    this.componentDidUpdate();
  }

  componentDidUpdate(): void {
    console.log("CDU");
    this.props.gs.updatePanels();
  }

  render() {
    return (
      <div className={styles.grids} id={this.props.id}>
        {this.props.cs.getPanels().map((p) => (
          <AppFrame panel={p} />
        ))}
      </div>
    );
  }
}

const AppFrame = ({ panel }: { panel: AppPanel }) => {
  return (
    <iframe
      src={panel.url}
      id={"iframe_" + panel.id}
      name={panel.id}
      slot={"slot_" + panel.id}
      className={styles.iframe}
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

const PopOutIcon = () => {
  return (
    <img
      src="/static/icons/control/pop-out.svg"
      className={styles.contentTitleIcon}
      title="Pop Out"
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
    <div className={styles.appSlot} id={"app_" + panel.id}>
      <slot name={"slot_" + panel.id} />
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
          <CloseIcon action={() => cs.removePanel(panel.id)} />
          <p className={styles.contentTitleText}>
            <span className={styles.contentTitleTextSpan}>{panel.title}</span>
          </p>
          <LockIcon />
          <PopOutIcon />
        </div>
        <div className={styles.contentBody}>
          {panel.url ? <AppSlot panel={panel} /> : <div />}
        </div>
      </div>
    </div>
  );
};
