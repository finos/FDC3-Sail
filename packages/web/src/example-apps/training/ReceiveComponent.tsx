import React, { useEffect, useState } from "react"
import { getAgent } from "@finos/fdc3-get-agent"
import { DesktopAgent } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import styles from "./receive.module.css"

export const ReceiveComponent = () => {
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [currentChannel, setCurrentChannel] = useState<string | null>(null)

  useEffect(() => {
    console.log("starting...")
    getAgent().then((agent) => {
      console.log("got api...")
      handleChannelChanged(agent)
      agent.addEventListener("userChannelChanged", () =>
        handleChannelChanged(agent),
      )
      agent.addContextListener(null, (context) => {
        setLogMessages((prev) => [
          ...prev,
          "Received: " + JSON.stringify(context),
        ])
      })
    })
  }, [])

  const handleChannelChanged = async (fdc3: DesktopAgent) => {
    const channel = await fdc3.getCurrentChannel()
    console.log("changed channel", channel)
    setCurrentChannel(channel?.id || null)
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
