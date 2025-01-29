import { Component } from "react"
import * as styles from "./styles.module.css"
import { ClientState, getClientState } from "../state/clientState"
import { Directory } from "@finos/fdc3-sail-common"
import { Popup } from "../popups/popup"

const CONFIG_ITEMS = ["Directories"]

type AppPanelProps = {
  closeAction: () => void
  cs: ClientState
}

type AppPanelState = {
  item: string
}

function updateText(url: string, text: string) {
  const directories = getClientState().getDirectories()
  const d = directories.find((d) => d.url == url)
  d!!.label = text
  getClientState().setDirectories(directories)
}

function updateUrl(url: string, text: string) {
  const directories = getClientState().getDirectories()
  const d = directories.find((d) => d.url == url)
  d!!.url = text
  getClientState().setDirectories(directories)
}

function toggleDirectory(d: Directory) {
  d.active = !d.active
  getClientState().updateDirectory(d)
}

function removeDirectory(d: Directory) {
  if (confirm("Remove this directory - are you sure?") == true) {
    const directories = getClientState().getDirectories()
    const i = directories.findIndex((x) => x.url == d.url)
    directories.splice(i, 1)
    getClientState().setDirectories(directories)
  }
}

const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add New Directory</p>
    </div>
  )
}

const InlineButton = ({
  text,
  url,
  onClick,
}: {
  text: string
  url: string
  onClick: () => void
}) => {
  return (
    <img
      src={url}
      className={styles.actionButton}
      title={text}
      onClick={onClick}
    />
  )
}

const DirectoryItem = ({ d }: { d: Directory }) => {
  return (
    <div
      key={d.url}
      className={`${styles.directoryItem} ${d.active ? styles.directoryActive : styles.directoryInactive}`}
    >
      <div className={styles.directoryName}>
        <p
          contentEditable={true}
          onBlur={(e) => updateText(d.url, e.currentTarget.textContent!!)}
        >
          {d.label}
        </p>
        <InlineButton
          onClick={() => toggleDirectory(d)}
          text="Toggle Use Of Directory"
          url="/static/icons/control/tick.svg"
        />
        <InlineButton
          onClick={() => removeDirectory(d)}
          text="Remove This Directory"
          url="/static/icons/control/cross.svg"
        />
      </div>
      <div
        className={styles.directoryUrl}
        contentEditable={true}
        onBlur={(e) => updateUrl(d.url, e.currentTarget.textContent!!)}
      >
        {d.url}
      </div>
    </div>
  )
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
              {this.state.item == CONFIG_ITEMS[0]
                ? getClientState()
                    .getDirectories()
                    .map((d) => <DirectoryItem key={d.url} d={d} />)
                : null}
              <AddButton
                onClick={() => {
                  const directories = getClientState().getDirectories()
                  directories.push({
                    label: "New Directory",
                    url: "",
                    active: false,
                  })
                  getClientState().setDirectories(directories)
                  this.setState(this.state)
                }}
              />
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
