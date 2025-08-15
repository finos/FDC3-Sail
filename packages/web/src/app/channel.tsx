import { TabDetail } from "@finos/fdc3-sail-shared"
import { Icon } from "./Icon"
import styles from "./styles.module.css"

const NO_CHANNEL: TabDetail = {
  background: "white",
  icon: "/icons/logo/logo.png",
  id: "No Channel",
}

export const Channel = ({
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
      <Icon text={channel.id} image={channel.icon} />
    </div>
  )
}

export const ChannelPicker = ({
  selected,
  channels,
  open,
  activate,
  changeSize,
}: {
  selected: string | null
  channels: TabDetail[]
  open: boolean
  activate: (id: string | null) => void
  changeSize: () => void
}) => {
  if (open) {
    return (
      <div className={styles.channelBox}>
        {channels.map((c) => {
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
  } else {
    const theChannel = channels.find((c) => c.id == selected) ?? NO_CHANNEL
    return (
      <div className={styles.channelBox}>
        <Channel channel={theChannel} active={true} onClick={changeSize} />
      </div>
    )
  }
}
