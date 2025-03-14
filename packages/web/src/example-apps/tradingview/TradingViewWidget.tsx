// TradingViewWidget.jsx
import { getAgent } from "@finos/fdc3"
import { useEffect, useRef, memo, useState } from "react"

/* eslint-disable  @typescript-eslint/no-explicit-any */

interface TradingViewIntent {
  name: string
  function: (context: any, setState: React.Dispatch<any>) => void
}

interface TradingViewListener {
  name: string
  function: (context: any, setState: React.Dispatch<any>) => void
}

interface TradingViewMode {
  name: string
  script: string
  innerHTML: (state: object) => string
  initialState: any
  intents: TradingViewIntent[]
  listeners: TradingViewListener[]
}

const MODES: TradingViewMode[] = [
  {
    name: "Chart",
    script:
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
    innerHTML: (state: object) => `{
          "autosize": true,
          "symbol": "NASDAQ:${state}",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "light",
          "style": "1",
          "locale": "en",
          "allow_symbol_change": false,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`,
    initialState: "TSLA",
    intents: [
      {
        name: "ViewChart",
        function: (context: any, setState: React.Dispatch<any>) => {
          setState(context?.id?.ticker)
        },
      },
    ],
    listeners: [
      {
        name: "fdc3.instrument",
        function: (context: any, setState: React.Dispatch<any>) => {
          setState(context?.id?.ticker)
        },
      },
    ],
  },
]

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
