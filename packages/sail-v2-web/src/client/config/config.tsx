import { Component } from "react"
import type { SailExtensionStorage } from "@finos/sail-extension"
import { SAIL_CONFIG_UI, type SailExtensionUI } from "@finos/sail-extension/ui"
import styles from "./styles.module.css"
import { ClientState } from "../../common"
import { Popup } from "../popups/popup"
import { DirectoryList } from "./directories"
import { TabList } from "./tabs"
import { CustomAppList } from "./customApps"
import { createClientStateExtensionStorage } from "../extension-storage"
import { getLoadedExtensionUIs, subscribeExtensionUIs } from "../extensions-runtime"

const CONFIG_ITEMS = ["Directories", "Tabs", "Custom Apps"]

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

type AppPanelState = {
  item: string
}

class ExtensionScreen extends Component<{
  ui: SailExtensionUI
  storage: SailExtensionStorage
}> {
  private host: HTMLDivElement | null = null
  private unmountFn: (() => void) | undefined

  componentDidMount() {
    if (this.host && this.props.ui.mount) {
      this.unmountFn = this.props.ui.mount(this.host, { storage: this.props.storage })
    }
  }

  componentWillUnmount() {
    this.unmountFn?.()
  }

  render() {
    return (
      <div
        ref={el => {
          this.host = el
        }}
      />
    )
  }
}

export class ConfigPanel extends Component<AppPanelProps, AppPanelState> {
  private unsubscribeUIs: (() => void) | undefined

  constructor(props: AppPanelProps) {
    super(props)
    this.state = {
      item: CONFIG_ITEMS[0],
    }
  }

  componentDidMount() {
    this.unsubscribeUIs = subscribeExtensionUIs(() => {
      this.forceUpdate()
    })
  }

  componentWillUnmount() {
    this.unsubscribeUIs?.()
  }

  render() {
    const extensionUIs = getLoadedExtensionUIs(SAIL_CONFIG_UI)
    const extension = extensionUIs.find(
      ui => ui.id === this.state.item || ui.title === this.state.item,
    )

    return (
      <Popup
        key="AppDConfigPopup"
        title="Sail Configuration"
        area={
          <div className={styles.configContent}>
            <div className={styles.configChoiceLeft}>
              {CONFIG_ITEMS.map(a => (
                <div
                  key={a}
                  className={`${styles.configItem} ${a == this.state.item ? styles.selected : ""}`}
                  onClick={() => this.setState({ item: a })}
                >
                  {a}
                </div>
              ))}
              {extensionUIs.map(ui => (
                <div
                  key={ui.id}
                  className={`${styles.configItem} ${ui.id == this.state.item ? styles.selected : ""}`}
                  onClick={() => this.setState({ item: ui.id })}
                >
                  {ui.title}
                </div>
              ))}
            </div>

            <div className={styles.configChoice}>
              {this.state.item == CONFIG_ITEMS[0] ? <DirectoryList /> : null}
              {this.state.item == CONFIG_ITEMS[1] ? <TabList /> : null}
              {this.state.item == CONFIG_ITEMS[2] ? <CustomAppList /> : null}
              {extension ? (
                <ExtensionScreen
                  ui={extension}
                  storage={createClientStateExtensionStorage(this.props.cs, extension.id)}
                />
              ) : null}
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
