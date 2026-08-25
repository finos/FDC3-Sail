import type { AppIdentifier, BrowserTypes } from "@finos/fdc3"
import { createRoot } from "react-dom/client"
import { ResolverPanel } from "../resolver/resolver"
import {
  isFdc3UserInterfaceHandshake,
  isFdc3UserInterfaceResolve,
} from "@finos/fdc3-schema/dist/generated/api/BrowserTypes"
import type { AugmentedAppIntent, TabDetail } from "../state"
import { connectUserInterfacePort, postIframeRestyle } from "./iframe-port"

type IframeResolvePayload = BrowserTypes.Fdc3UserInterfaceResolvePayload

const channels: TabDetail[] = []

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
  const container = document.getElementById("intentResolver")!
  const root = createRoot(container)

  const myPort = connectUserInterfacePort("Sail Intent Resolver v1.0", DEFAULT_COLLAPSED_CSS)

  function renderIntentResolver(data: IframeResolvePayload | null) {
    if (data) {
      postIframeRestyle(myPort, DEFAULT_EXPANDED_CSS)

      root.render(
        <ResolverPanel
          context={data.context}
          appIntents={data.appIntents as AugmentedAppIntent[]}
          currentChannel={null}
          closeAction={() => {
            renderIntentResolver(null)
          }}
          channelDetails={channels}
          chooseAction={(app, intent) => {
            callback(intent, app)
            renderIntentResolver(null)
          }}
        />,
      )
    } else {
      postIframeRestyle(myPort, DEFAULT_COLLAPSED_CSS)
    }
  }

  function callback(intent: string | null, app: AppIdentifier | null) {
    postIframeRestyle(myPort, DEFAULT_COLLAPSED_CSS)

    if (intent && app && app.instanceId == undefined) {
      myPort.postMessage({
        type: "Fdc3UserInterfaceResolveAction",
        payload: {
          action: "click",
          appIdentifier: app,
          intent: intent,
        },
      })
    } else {
      myPort.postMessage({
        type: "Fdc3UserInterfaceResolveAction",
        payload: {
          action: "cancel",
        },
      })
    }
  }

  myPort.addEventListener("message", e => {
    if (isFdc3UserInterfaceHandshake(e.data)) {
      renderIntentResolver(null)
    } else if (isFdc3UserInterfaceResolve(e.data)) {
      renderIntentResolver(e.data.payload)
    }
  })
})
