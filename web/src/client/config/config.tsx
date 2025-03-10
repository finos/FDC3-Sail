import { Component } from "react"
import styles from "./styles.module.css"
import { ClientState } from "@finos/fdc3-sail-common"
import { Popup } from "../popups/popup"
import { DirectoryList } from "./directories"
import { TabList } from "./tabs"

const CONFIG_ITEMS = ["Directories", "Tabs"]

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

type AppPanelState = {
  item: string
}

export class ConfigPanel extends Component<AppPanelProps, AppPanelState> {
  constructor(props: AppPanelProps) {
    super(props)
    this.state = {
      item: CONFIG_ITEMS[0],
    }
  }

  render() {
    return (
      <Popup
        key="AppDConfigPopup"
        title="Sail Configuration"
        area={
          <div className={styles.configContent}>
            <div className={styles.configChoice}>
              {CONFIG_ITEMS.map((a) => (
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
              {this.state.item == CONFIG_ITEMS[0] ? <DirectoryList /> : null}
              {this.state.item == CONFIG_ITEMS[1] ? <TabList /> : null}
            </div>
          </div>
        }
        buttons={[]}
        closeAction={() => this.props.closeAction()}
        closeName="Done"
      />
    )
  }
}
