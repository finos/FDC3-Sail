import { createRoot } from "react-dom/client"
import type { TabDetail } from "../state"
import {
  isFdc3UserInterfaceChannels,
  isFdc3UserInterfaceHandshake,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { connectUserInterfacePort, postIframeRestyle } from "./iframe-port"
import styles from "./styles.module.css"

const channels: TabDetail[] = []

const DEFAULT_COLLAPSED_CSS = {
  position: "fixed",
  "z-index": 1000,
  right: "10px",
  bottom: "10px",
  width: "65px",
  height: "65px",
  transition: "all 0.5s ease-out allow-discrete",
}

const DEFAULT_EXPANDED_CSS = {
  position: "fixed",
  "z-index": 1000,
  right: "10px",
  bottom: "10px",
  height: "65px",
  transition: "all 0.5s ease-out allow-discrete",
}

const NO_CHANNEL: TabDetail = {
  background: "white",
  icon: "/icons/logo/logo.png",
  id: "No Channel",
}

const ChannelIcon = ({ image, text }: { image: string; text: string }) => {
  return <img src={image} className={styles.iconImage} title={text} />
}

const Channel = ({
  channel,
  active,
  onClick,
}: {
  channel: TabDetail
  active: boolean
  onClick: () => void
}) => {
  return (
    <div
      className={`${styles.channel} ${active ? styles.active : styles.inactive}`}
      style={{ backgroundColor: channel.background }}
      onClick={onClick}
    >
      <ChannelIcon text={channel.id} image={channel.icon} />
    </div>
  )
}

const ChannelPicker = ({
  selected,
  channelList,
  open,
  activate,
  changeSize,
}: {
  selected: string | null
  channelList: TabDetail[]
  open: boolean
  activate: (id: string | null) => void
  changeSize: () => void
}) => {
  if (open) {
    return (
      <div className={styles.channelBox}>
        {channelList.map(c => {
          return (
            <Channel
              key={c.id}
              channel={c}
              active={c.id == selected}
              onClick={() => {
                activate(c.id)
                changeSize()
              }}
            />
          )
        })}

        <Channel
          channel={NO_CHANNEL}
          active={selected == null}
          onClick={() => {
            activate(null)
            changeSize()
          }}
        />
      </div>
    )
  }

  const theChannel = channelList.find(c => c.id == selected) ?? NO_CHANNEL
  return (
    <div className={styles.channelBox}>
      <Channel channel={theChannel} active={true} onClick={changeSize} />
    </div>
  )
}

let channelId: string | null = null

window.addEventListener("load", () => {
  const container = document.getElementById("channelSelector")!
  const root = createRoot(container)
  let open = false

  const myPort = connectUserInterfacePort("Sail Channel Selector v1.0", DEFAULT_COLLAPSED_CSS)

  function changeSize(expanded: boolean) {
    open = expanded
    renderChannels(open)
    document.body.setAttribute("data-expanded", "" + expanded)
    postIframeRestyle(
      myPort,
      expanded
        ? {
            ...DEFAULT_EXPANDED_CSS,
            width: `${55 * channels.length + 70}px`,
          }
        : DEFAULT_COLLAPSED_CSS,
    )
  }

  function activate(selectedChannelId: string | null) {
    myPort.postMessage({
      type: "Fdc3UserInterfaceChannelSelected",
      payload: { selected: selectedChannelId },
    })
  }

  function renderChannels(isOpen: boolean) {
    root.render(
      <ChannelPicker
        channelList={channels}
        selected={channelId}
        open={isOpen}
        activate={activate}
        changeSize={() => changeSize(!isOpen)}
      />,
    )
  }

  myPort.addEventListener("message", e => {
    if (isFdc3UserInterfaceHandshake(e.data)) {
      postIframeRestyle(myPort, DEFAULT_COLLAPSED_CSS)
    } else if (isFdc3UserInterfaceChannels(e.data)) {
      const details = e.data

      if (channels.length == 0) {
        const tabDetails = details.payload.userChannels.map(c => {
          const out: TabDetail = {
            background: c.displayMetadata?.color ?? "white",
            icon: c.displayMetadata?.glyph ?? "/icons/logo/logo.svg",
            id: c.id,
          }
          return out
        })
        channels.push(...tabDetails)
      }

      channelId = details.payload.selected
      renderChannels(false)
    }
  })

  renderChannels(open)
})
