import { Component } from "react";
import * as styles from "./styles.module.css";
import { ClientState, Directory, getClientState } from "../state/client";
import { Popup } from "../popups/popup";

const CONFIG_ITENS = ["Directories", "Something else", "Thing 3", "Thing 4"];

type AppPanelProps = {
  closeAction: () => void;
  cs: ClientState;
};

type AppPanelState = {
  item: string;
};

function toggleDirectory(d: Directory) {
  d.active = !d.active;
  getClientState().updateDirectory(d);
}

export class ConfigPanel extends Component<AppPanelProps, AppPanelState> {
  constructor(props: AppPanelProps) {
    super(props);
    this.state = {
      item: CONFIG_ITENS[0],
    };
  }

  render() {
    return (
      <Popup
        key="AppDConfigPopup"
        title="Sail Configuration"
        area={
          <div className={styles.configContent}>
            <div className={styles.configChoice}>
              {CONFIG_ITENS.map((a) => (
                <div
                  key={a}
                  className={`${styles.configItem} ${a == this.state.item ? styles.selected : ""}`}
                  onClick={() => this.setState({ item: a })}
                >
                  {a}
                </div>
              ))}
            </div>

            <div className={styles.configChoice}>
              {this.state.item == CONFIG_ITENS[0]
                ? getClientState()
                    .getDirectories()
                    .map((d) => (
                      <div
                        key={d.url}
                        className={`${styles.directoryItem} ${d.active ? styles.directoryActive : styles.directoryInactive}`}
                        onClick={() => toggleDirectory(d)}
                      >
                        <div className={styles.directoryName}>{d.label}</div>
                        <div className={styles.directoryUrl}>{d.url}</div>
                      </div>
                    ))
                : null}
            </div>
          </div>
        }
        buttons={[]}
        closeAction={() => this.props.closeAction()}
      />
    );
  }
}
