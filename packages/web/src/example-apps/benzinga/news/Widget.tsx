// TradingViewWidget.jsx
import { getAgent } from "@finos/fdc3"
import { useEffect, useRef, useState } from "react"

export const Widget = () => {
  const [state, setState] = useState("")
  const container: any = useRef()

  useEffect(() => {
    getAgent().then((fdc3) => {
      fdc3.addIntentListener("ViewChart", async (context) => {
        if (context?.id?.ticker && context.type == "fdc3.instrument") {
          setState(context?.id?.ticker)
        }
      })

      fdc3.addContextListener("fdc3.instrument", async (context) => {
        setState(context?.id?.ticker)
      })
    })
  }, [])

  useEffect(() => {
    let script: HTMLScriptElement | null = null

    script = document.getElementById("widget-script") as HTMLScriptElement

    if (script) {
      container.current.removeChild(script)
    }

    const contents = document.getElementById("bzf")
    if (contents) {
      contents.innerHTML = ""
    }

    script = document.createElement("script")
    container.current.appendChild(script)

    script.id = "widget-script"
    script.src = "https://www.benzinga.com/widgets.js"
    script.type = "text/javascript"
    script.async = true
  }, [state])

  return (
    <div style={{ width: "100%", height: "100%" }} ref={container}>
      <div
        id="bzf"
        className="bz-widget"
        data-name="newsfeed"
        data-ticker={state}
      ></div>
      <div style={{ textAlign: "center", width: "100%", fontSize: "14px" }}>
        <a
          href="https://www.benzinga.com"
          rel="noopener"
          target="_blank"
          style={{ color: "#6a6d78", textDecoration: "none" }}
        >
          Provided by <span style={{ color: "#2ca2d1" }}>Benzinga</span>
        </a>
      </div>
    </div>
  )
}
