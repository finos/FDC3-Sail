import { BrowserTypes, AppIdentifier } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import { ResolverPanel } from "../client/resolver/resolver"
import {
  isFdc3UserInterfaceHandshake,
  isFdc3UserInterfaceResolve,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import { AugmentedAppIntent, getClientState } from "@finos/fdc3-sail-common"

type IframeResolveAction = BrowserTypes.Fdc3UserInterfaceResolveAction
type IframeResolvePayload = BrowserTypes.Fdc3UserInterfaceResolvePayload
type IframeHello = BrowserTypes.Fdc3UserInterfaceHello
type IframeRestyle = BrowserTypes.Fdc3UserInterfaceRestyle

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
  const container = document.getElementById("intentResolver")!
  const root = createRoot(container)

  const mc = new MessageChannel()
  const myPort = mc.port1
  myPort.start()

  const hello: IframeHello = {
    type: "Fdc3UserInterfaceHello",
    payload: {
      initialCSS: DEFAULT_COLLAPSED_CSS,
      implementationDetails: "Sail Intent Resolver v1.0",
    },
  }

  parent.postMessage(hello, "*", [mc.port2])

  function renderIntentResolver(data: IframeResolvePayload | null) {
    if (data) {
      const restyle: IframeRestyle = {
        type: "Fdc3UserInterfaceRestyle",
        payload: { updatedCSS: DEFAULT_EXPANDED_CSS },
      }

      myPort.postMessage(restyle)

      root.render(
        <ResolverPanel
          context={data.context}
          appIntents={data.appIntents as AugmentedAppIntent[]}
          channelDetails={getClientState().getTabs()}
          currentChannel={null}
          appDetails={getClientState().getKnownApps()}
          panelDetails={getClientState().getPanels()}
          closeAction={() => {
            renderIntentResolver(null)
          }}
          chooseAction={(app, intent, channel) => {
            if (channel) {
              getClientState().setActiveTabId(channel)
            }
            callback(intent, app)
            renderIntentResolver(null)
          }}
        />,
      )
    } else {
      myPort.postMessage({
        type: "Fdc3UserInterfaceRestyle",
        payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
      } as IframeRestyle)
    }
  }

  function callback(intent: string | null, app: AppIdentifier | null) {
    myPort.postMessage({
      type: "Fdc3UserInterfaceRestyle",
      payload: { updatedCSS: DEFAULT_COLLAPSED_CSS },
    } as IframeRestyle)

    if (intent && app) {
      myPort.postMessage({
        type: "Fdc3UserInterfaceResolveAction",
        payload: {
          action: "click",
          appIdentifier: app,
          intent: intent,
        },
      } as IframeResolveAction)
    } else {
      myPort.postMessage({
        type: "Fdc3UserInterfaceResolveAction",
        payload: {
          action: "cancel",
        },
      } as IframeResolveAction)
    }
  }

  myPort.addEventListener("message", (e) => {
    if (isFdc3UserInterfaceHandshake(e.data)) {
      renderIntentResolver(null)
    } else if (isFdc3UserInterfaceResolve(e.data)) {
      renderIntentResolver(e.data.payload)
    }
  })

  document.getElementById("cancel")!.addEventListener("click", () => {
    callback(null, null)
  })
})
