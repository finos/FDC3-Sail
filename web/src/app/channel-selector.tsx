import { BrowserTypes } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import { ChannelPicker } from "./channel"
import { TabDetail } from "@finos/fdc3-sail-common"
import "../../static/fonts/DM_Sans/DM_Sans.css"

type IframeChannels = BrowserTypes.Fdc3UserInterfaceChannels
type IframeHello = BrowserTypes.Fdc3UserInterfaceHello
type IframeRestyle = BrowserTypes.Fdc3UserInterfaceRestyle
type IframeChannelSelected = BrowserTypes.Fdc3UserInterfaceChannelSelected

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
      type: "Fdc3UserInterfaceHello",
      payload: {
        initialCSS: DEFAULT_COLLAPSED_CSS,
        implementationDetails: "Sail Channel Selector v1.0",
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
      type: "Fdc3UserInterfaceRestyle",
      payload: {
        updatedCSS: expanded ? DEFAULT_EXPANDED_CSS : DEFAULT_COLLAPSED_CSS,
      },
    } as IframeRestyle)
  }

  function activate(channelId: string | null) {
    myPort.postMessage({
      type: "Fdc3UserInterfaceChannelSelected",
      payload: { selected: channelId },
    } as IframeChannelSelected)
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
    if (e.data.type == "FDC3UserInterfaceHandshake") {
      // ok, port is ready, send the iframe position detials
      myPort.postMessage({
        type: "Fdc3UserInterfaceRestyle",
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
