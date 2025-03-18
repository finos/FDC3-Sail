import { useEffect, useState } from "react"
import { getAgent } from "@finos/fdc3-get-agent"
import { DesktopAgent, Listener } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import styles from "./receive.module.css"

export const ReceiveComponent = () => {
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [currentChannel, setCurrentChannel] = useState<string | null>(null)
  const [listener, setListener] = useState<Promise<Listener> | null>(null)

  useEffect(() => {
    console.log("starting...")
    getAgent().then((agent) => {
      console.log("got api...")
      handleChannelChanged(agent)

      agent.addEventListener("userChannelChanged", () =>
        handleChannelChanged(agent),
      )
    })
  }, [])

  const handleChannelChanged = async (fdc3: DesktopAgent) => {
    const channel = await fdc3.getCurrentChannel()
    if (channel !== currentChannel) {
      console.log("setting channel", channel)
      setCurrentChannel(channel?.id || null)
    }

    setListener((l) => {
      if (l == null && channel != null) {
        console.log("setting listener", listener)
        const lp = fdc3.addContextListener(null, (context) => {
          setLogMessages((prev) => [
            ...prev,
            "Received: " + JSON.stringify(context),
          ])
        })

        return lp
      } else {
        return l
      }
    })
  }

  return (
    <div className={styles.receiveComponent}>
      <h2>Receive Component</h2>
      <div className={styles.channelInfo}>
        Current channel: {currentChannel}
      </div>
      <div id="log" className={styles.receiveLog}>
        {logMessages.map((msg, index) => (
          <p className={styles.message} key={index}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  )
}

const container = document.getElementById("app")
const root = createRoot(container!)

root.render(<ReceiveComponent />)
