// TradingViewWidget.jsx
import { getAgent } from "@finos/fdc3"
import { useEffect, useRef, memo, useState } from "react"

export const TradingViewWidget = () => {
  const container: any = useRef()

  const [state, setState] = useState("TSLA")

  useEffect(() => {
    getAgent().then((fdc3) => {
      fdc3.addIntentListener("ViewChart", async (context) => {
        setState(context?.id?.ticker)
      })

      fdc3.addContextListener("fdc3.instrument", async (context) => {
        setState(context?.id?.ticker)
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
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    // eslint-disable-next-line javascript.browser.security.insecure-document-method.insecure-document-method
    script.innerHTML = `
        {
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
        }`
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
