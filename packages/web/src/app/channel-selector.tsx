import { BrowserTypes } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import { ChannelPicker } from "./channel"
import {
  CHANNEL_SELECTOR_HELLO,
  CHANNEL_SELECTOR_UPDATE,
  ChannelSelectorHelloRequest,
  ChannelSelectorUpdateRequest,
  TabDetail,
} from "@finos/fdc3-sail-common"
import {
  isFdc3UserInterfaceChannels,
  isFdc3UserInterfaceHandshake,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { io, Socket } from "socket.io-client"
import { getInstanceId, getUserSessionId } from "./util"

type IframeHello = BrowserTypes.Fdc3UserInterfaceHello
type IframeRestyle = BrowserTypes.Fdc3UserInterfaceRestyle
type IframeChannelSelected = BrowserTypes.Fdc3UserInterfaceChannelSelected

let channels: TabDetail[] = []
let channelId: string | null = null

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

window.addEventListener("load", () => {
  const parent = window.parent
  const container = document.getElementById("channelSelector")!
  const root = createRoot(container)
  let open: boolean = false

  const mc = new MessageChannel()
  const myPort = mc.port1
  myPort.start()

  const hello: IframeHello = {
    type: "Fdc3UserInterfaceHello",
    payload: {
      initialCSS: DEFAULT_COLLAPSED_CSS,
      implementationDetails: "Sail Channel Selector v1.0",
    },
  }

  parent.postMessage(hello, "*", [mc.port2])

  function changeSize(expanded: boolean) {
    open = expanded
    renderChannels(open)
    document.body.setAttribute("data-expanded", "" + expanded)
    const restyle: IframeRestyle = {
      type: "Fdc3UserInterfaceRestyle",
      payload: {
        updatedCSS: expanded
          ? {
              ...DEFAULT_EXPANDED_CSS,
              width: `${55 * channels.length + 70}px`,
            }
          : DEFAULT_COLLAPSED_CSS,
      },
    }

    myPort.postMessage(restyle)
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

  function handleChannelUpdates(socket: Socket) {
    socket.on("connect", async () => {
      const msg: ChannelSelectorHelloRequest = {
        userSessionId: getUserSessionId(),
        instanceId: getInstanceId(),
      }
      socket.emitWithAck(CHANNEL_SELECTOR_HELLO, msg)
    })

    socket.on(CHANNEL_SELECTOR_UPDATE, (data: ChannelSelectorUpdateRequest) => {
      channels = data.tabs
      renderChannels(open)
    })
  }

  myPort.addEventListener("message", (e) => {
    console.log(e.data.type)
    if (isFdc3UserInterfaceHandshake(e.data)) {
      // ok, port is ready, send the iframe position details
      myPort.postMessage({
        type: "Fdc3UserInterfaceRestyle",
        payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
      } as IframeRestyle)
    } else if (isFdc3UserInterfaceChannels(e.data)) {
      const details = e.data
      console.log(
        JSON.stringify("SAIL CHANNEL DETAILS: " + JSON.stringify(details)),
      )

      channels = details.payload.userChannels.map((c) => {
        return {
          background: c.displayMetadata?.color ?? "white",
          icon: c.displayMetadata?.glyph ?? "/icons/logo/logo.svg",
          title: c.displayMetadata?.name ?? "Untitled",
          id: c.id,
        }
      })
      channelId = details.payload.selected
      renderChannels(false)
    }
  })

  const socket = io()

  handleChannelUpdates(socket)

  renderChannels(false)
})
