// TradingViewWidget.jsx
import { getAgent } from "@kite9/fdc3"
import { useEffect, useRef, memo, useState } from "react"

export const EmbeddedScreen = () => {
  const [state, setState] = useState("https://finance.yahoo.com/")

  useEffect(() => {
    getAgent().then((fdc3) => {
      fdc3.addIntentListener("ViewChart", async (context) => {
        if (context?.id?.ticker && context.type == "fdc3.instrument") {
          setState(
            `https://finance.yahoo.com/quote/${context?.id?.ticker}/news/`,
          )
        }
      })

      fdc3.addContextListener("fdc3.instrument", async (context) => {
        setState(`https://finance.yahoo.com/quote/${context?.id?.ticker}/news/`)
      })
    })
  }, [])

  return <iframe width={"100%"} height={"100%"} src={state} />
}

export default memo(EmbeddedScreen)
