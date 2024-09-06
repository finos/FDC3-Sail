import { Component } from "react";
import { Icon } from "../icon/icon";
import { getServerState } from "../state/ServerState";
import * as styles from "./styles.module.css";
import { Popup, PopupButton } from "../popups/popup";
import { DirectoryApp } from "@kite9/da-server";
import { getAppState } from "../state/AppState";

const DEFAULT_ICON = "/static/icons/control/choose-app.svg";

function getIcon(a: DirectoryApp) {
  const icons = a.icons ?? [];
  if (icons.length > 0) {
    return icons[0].src;
  } else {
    return DEFAULT_ICON;
  }
}

type AppPanelProps = { closeAction: () => void };

type AppPanelState = {
  chosen: DirectoryApp | null;
  apps: DirectoryApp[];
};

export class AppDPanel extends Component<AppPanelProps, AppPanelState> {
  constructor(props: AppPanelProps) {
    super(props);
    this.state = {
      chosen: null,
      apps: [],
    };
  }

  componentDidMount = () => {
    getServerState()
      .getApplications()
      .then((apps) => {
        //console.log("loaded - ready to display")
        this.setState({
          chosen: null,
          apps: apps.filter((d) => onlyRelevantApps(d)),
        });
      });
  };

  setChosen(app: DirectoryApp) {
    //console.log("state changed " + app.appId);
    this.setState({
      apps: this.state.apps,
      chosen: app,
    });
  }

  render() {
    const app: DirectoryApp = this.state.chosen;

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

            <div className={styles.appDDetail}>
              {app ? (
                <div className={styles.appDInfo}>
                  <h2>{app.title}</h2>
                  <p>{app.description}</p>
                  <ul>{app.categories?.map((c: any) => <li>{c}</li>)}</ul>
                  <div className={styles.appDScreenshots}>
                    {app.screenshots?.map((s: any) => (
                      <img key={s.src} src={s.src} title={s.label} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        }
        buttons={[
          <PopupButton
            key="open"
            text="open"
            disabled={this.state.chosen == null}
            onClick={async () => {
              if (this.state.chosen) {
                getAppState().open(this.state.chosen);
                this.props.closeAction();
              }
            }}
          />,
        ]}
        closeAction={() => this.props.closeAction()}
      />
    );
  }
}
function onlyRelevantApps(d: DirectoryApp): boolean {
  const sail = d.hostManifests?.sail;
  const show = sail ? sail.searchable != false : true;
  const type = d.type == "web";
  const url = d.details?.url;
  return show && type && url;
}
