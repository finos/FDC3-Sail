// TradingViewWidget.jsx
import { getAgent } from "@finos/fdc3"
import { useEffect, useRef, memo, useState } from "react"

/* eslint-disable  @typescript-eslint/no-explicit-any */

import { TradingViewMode } from "./common"
import { chartMode } from "./modes/chart"
import { symbolInfoMode } from "./modes/symbol-info"
import { fundamentalsMode } from "./modes/fundamentals"

const MODES: TradingViewMode[] = [chartMode, symbolInfoMode, fundamentalsMode]

export const TradingViewWidget = ({ mode }: { mode: string }) => {
  const container: any = useRef()
  const modeProps = MODES.find((m) => m.name === mode) ?? MODES[0]

  const [state, setState] = useState(modeProps.initialState)

  useEffect(() => {
    getAgent().then((fdc3) => {
      modeProps.intents.forEach((intent) => {
        fdc3.addIntentListener(intent.name, (context) => {
          intent.function(context, setState)
        })
      })

      modeProps.listeners.forEach((listener) => {
        fdc3.addContextListener(listener.name, (context) => {
          listener.function(context, setState)
        })
      })
    })
  }, [])

  useEffect(() => {
    let script: HTMLScriptElement | null = null

    script = document.getElementById(
      "tradingview-widget-script",
    ) as HTMLScriptElement

    if (script) {
      container.current.removeChild(script)
    }

    script = document.createElement("script")
    container.current.appendChild(script)

    script.id = "tradingview-widget-script"
    script.src = modeProps.script

    script.type = "text/javascript"
    script.async = true
    // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
    script.innerHTML = modeProps.innerHTML(state)
  }, [state])

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "100%", width: "100%" }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      ></div>
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text"> Track all markets on TradingView </span>
        </a>
      </div>
    </div>
  )
}

export default memo(TradingViewWidget)
