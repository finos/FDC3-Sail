import { BrowserTypes } from "@kite9/fdc3"
import { createRoot } from "react-dom/client"
import { ChannelPicker } from "./channel"
import { TabDetail } from "../client/state/ClientState"
import "../../static/fonts/DM_Sans/DM_Sans.css"

type IframeChannels = BrowserTypes.IframeChannels
type IframeHello = BrowserTypes.IframeHello
type IframeRestyle = BrowserTypes.IframeRestyle

var channels: TabDetail[] = []
var channelId: string | null = null

const DEFAULT_COLLAPSED_CSS = {
  position: "fixed",
  "z-index": 1000,
  right: "10px",
  bottom: "10px",
  width: "55px",
  height: "55px",
  transition: "all 0.5s ease-out allow-discrete",
}

const DEFAULT_EXPANDED_CSS = {
  position: "fixed",
  "z-index": 1000,
  right: "10px",
  bottom: "10px",
  width: "250px",
  height: "55px",
  transition: "all 0.5s ease-out allow-discrete",
}

window.addEventListener("load", () => {
  const parent = window.parent
  const container = document.getElementById("channelSelector")!!
  const root = createRoot(container!)
  var open: boolean = false

  const mc = new MessageChannel()
  const myPort = mc.port1
  myPort.start()

  // ISSUE: 1302
  parent.postMessage(
    {
      type: "iframeHello",
      payload: {
        initialCSS: DEFAULT_COLLAPSED_CSS,
        implementationDetails: "Demo Channel Selector v1.0",
      },
    } as any as IframeHello,
    "*",
    [mc.port2],
  )

  function changeSize(expanded: boolean) {
    open = expanded
    renderChannels(open)
    document.body.setAttribute("data-expanded", "" + expanded)
    myPort.postMessage({
      type: "iframeRestyle",
      payload: {
        updatedCSS: expanded ? DEFAULT_EXPANDED_CSS : DEFAULT_COLLAPSED_CSS,
      },
    } as IframeRestyle)
  }

  function activate(channelId: string | null) {
    myPort.postMessage({
      type: "iframeChannelSelected",
      payload: { selected: channelId },
    })
  }

  function renderChannels(isOpen: boolean) {
    root.render(
      <ChannelPicker
        channels={channels}
        selected={channelId}
        open={isOpen}
        activate={activate}
        changeSize={() => changeSize(!isOpen)}
      />,
    )
  }

  myPort.addEventListener("message", (e) => {
    console.log(e.data.type)
    if (e.data.type == "iframeHandshake") {
      // ok, port is ready, send the iframe position detials
      myPort.postMessage({
        type: "iframeRestyle",
        payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
      } as IframeRestyle)
    } else if (e.data.type == "iframeChannels") {
      const details = e.data as IframeChannels
      console.log(JSON.stringify("CHANNEL DETAILS: " + JSON.stringify(details)))

      channels = details.payload.userChannels.map((c) => {
        return {
          background: c.displayMetadata?.color ?? "white",
          icon:
            c.displayMetadata?.glyph ??
            "/static/tabs/noun-airplane-3707662.svg",
          title: c.displayMetadata?.name ?? "Untitled",
          id: c.id,
        }
      })
      channelId = details.payload.selected
      renderChannels(false)
    }
  })

  renderChannels(false)
})
