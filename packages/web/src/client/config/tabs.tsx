import { getClientState, TabDetail } from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { InlineButton } from "./shared"
import { Icon } from "../icon/icon"

const ICON_PATH = "/static/icons/tabs/"

const BUILT_IN_TABS: string[] = [
  "noun-airplane-3707662.svg",
  "noun-camera-3707659.svg",
  "noun-camera-3707661.svg",
  "noun-cellphone-3707657.svg",
  "noun-checked-baggage-3707665.svg",
  "noun-console-3707664.svg",
  "noun-driller-3707669.svg",
  "noun-headphone-3707674.svg",
  "noun-machine-3707678.svg",
  "noun-pen-3707679.svg",
  "noun-power-3707684.svg",
  "noun-printer-3707691.svg",
  "noun-radio-3707701.svg",
  "noun-ship-3707690.svg",
  "noun-ship-3707693.svg",
  "noun-washing-3707699.svg",
]

const BACKGROUND_COLOURS = [
  "#7c6f77", // muted mauve
  "#5f7a6c", // sage green
  "#8b3a3a", // muted burgundy
  "#4a6670", // slate blue-gray
  "#796e55", // warm taupe
  "#6b4c5e", // dusty plum
  "#4b6b58", // forest sage
  "#725c44", // coffee brown
  "#4a5c7b", // dusty navy
  "#7a5f5f", // rustic rose
]

function newIconUrl(): string {
  return (
    ICON_PATH +
    BUILT_IN_TABS[getClientState().getTabs().length % BUILT_IN_TABS.length]
  )
}

function newTabTitle(): string {
  return "Tab " + (getClientState().getTabs().length + 1)
}

function newBackgroundColour(): string {
  return BACKGROUND_COLOURS[
    getClientState().getTabs().length % BACKGROUND_COLOURS.length
  ]
}

function updateBackground(id: string, background: string) {
  const tab = getClientState()
    .getTabs()
    .find((t) => t.id == id)!
  tab.background = background
  getClientState().updateTab(tab)
}

function updateTitle(id: string, text: string) {
  const tab = getClientState()
    .getTabs()
    .find((t) => t.id == id)!
  tab.id = text
  getClientState().updateTab(tab)
}

function updateIconUrl(id: string, url: string) {
  const tab = getClientState()
    .getTabs()
    .find((t) => t.id == id)!
  tab.icon = url
  getClientState().updateTab(tab)
}

function move(id: string, d: "up" | "down") {
  getClientState().moveTab(id, d)
}

function removeTab(is: string) {
  if (getClientState().getTabs().length == 1) {
    alert("Cannot remove the last tab")
    return
  }

  if (
    getClientState()
      .getPanels()
      .find((p) => p.tabId == is)
  ) {
    alert("Cannot remove a tab -  close the applications on it first")
    return
  }

  if (confirm("Remove this tab - are you sure?") == true) {
    getClientState().removeTab(is)
  }
}

const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add New Tab</p>
    </div>
  )
}

const TabItem = ({ d }: { d: TabDetail }) => {
  return (
    <div key={d.id} className={styles.item}>
      <div className={styles.verticalControls}>
        <div className={styles.icon} style={{ backgroundColor: d.background }}>
          <Icon text={d.id} image={d.icon} dark={true} />
        </div>
      </div>
      <div className={styles.verticalControls}>
        <input
          className={styles.color}
          type="color"
          value={d.background}
          onChange={(e) => updateBackground(d.id, e.currentTarget.value)}
        />
      </div>

      <div className={styles.verticalControlsGrow}>
        <div
          className={styles.name}
          contentEditable={true}
          onBlur={(e) => updateTitle(d.id, e.currentTarget.textContent!)}
        >
          {d.id}
        </div>
        <div
          className={styles.url}
          contentEditable={true}
          onBlur={(e) => updateIconUrl(d.id, e.currentTarget.textContent!)}
        >
          {d.icon}
        </div>
      </div>
      <div className={styles.verticalControlsSlim}>
        <InlineButton
          onClick={() => move(d.id, "up")}
          text="Move Tab Up"
          url="/static/icons/control/move-up.svg"
        />
        <InlineButton
          onClick={() => move(d.id, "down")}
          text="Move Tab Down"
          url="/static/icons/control/move-down.svg"
        />
      </div>

      <InlineButton
        onClick={() => removeTab(d.id)}
        text="Remove This Tab"
        url="/static/icons/control/bin.svg"
      />
    </div>
  )
}

export const TabList = () => {
  return (
    <div className={styles.list}>
      {getClientState()
        .getTabs()
        .map((d) => (
          <TabItem key={d.id} d={d} />
        ))}
      <AddButton
        onClick={() => {
          getClientState().addTab({
            id: newTabTitle(),
            icon: newIconUrl(),
            background: newBackgroundColour(),
          })
        }}
      />{" "}
    </div>
  )
}
