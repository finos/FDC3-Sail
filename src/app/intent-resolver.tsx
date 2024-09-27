import { BrowserTypes, AppIdentifier } from "@kite9/fdc3"
import { createRoot } from "react-dom/client"
import { ResolverPanel } from "../client/resolver/resolver"
import "/static/fonts/DM_Sans/DM_Sans.css"

type IframeResolveAction = BrowserTypes.IframeResolveAction
type IframeResolvePayload = BrowserTypes.IframeResolvePayload
type IframeHello = BrowserTypes.IframeHello
type IframeRestyle = BrowserTypes.IframeRestyle

const DEFAULT_COLLAPSED_CSS = {
  position: "fixed",
  "z-index": 1000,
  right: "0",
  bottom: "0",
  width: "0",
  height: "0",
}

const DEFAULT_EXPANDED_CSS = {
  position: "fixed",
  "z-index": 1000,
  left: "0",
  top: "0",
  right: "0",
  bottom: "0",
}
window.addEventListener("load", () => {
  const parent = window.parent
  const container = document.getElementById("intentResolver")!!
  const root = createRoot(container!)

  const mc = new MessageChannel()
  const myPort = mc.port1
  myPort.start()

  // ISSUE: 1302
  parent.postMessage(
    {
      type: "iframeHello",
      payload: {
        initialCSS: DEFAULT_COLLAPSED_CSS,
        implementationDetails: "Sail Intent Resolver v1.0",
      },
    } as any as IframeHello,
    "*",
    [mc.port2],
  )

  function renderIntentResolver(data: IframeResolvePayload | null) {
    if (data) {
      myPort.postMessage({
        type: "iframeRestyle",
        payload: { updatedCSS: DEFAULT_EXPANDED_CSS },
      } as IframeRestyle)
      root.render(
        <ResolverPanel
          context={data.context}
          appIntents={data.appIntents}
          closeAction={() => {
            renderIntentResolver(null)
          }}
          chooseAction={(app, intent) => {
            callback(intent, app)
            renderIntentResolver(null)
          }}
        />,
      )
    } else {
      myPort.postMessage({
        type: "iframeRestyle",
        payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
      } as IframeRestyle)
    }
  }

  function callback(intent: string | null, app: AppIdentifier | null) {
    myPort.postMessage({
      type: "iframeRestyle",
      payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
    } as IframeRestyle)

    if (intent && app) {
      myPort.postMessage({
        type: "iframeResolveAction",
        payload: {
          action: "click",
          appIdentifier: app,
          intent: intent,
        },
      } as IframeResolveAction)
    } else {
      myPort.postMessage({
        type: "iframeResolveAction",
        payload: {
          action: "cancel",
        },
      } as IframeResolveAction)
    }
  }

  myPort.addEventListener("message", (e) => {
    if (e.data.type == "iframeHandshake") {
      renderIntentResolver(null)
    } else if (e.data.type == "iframeResolve") {
      renderIntentResolver(e.data.payload)
    }
  })

  document.getElementById("cancel")!!.addEventListener("click", () => {
    callback(null, null)
  })
})
