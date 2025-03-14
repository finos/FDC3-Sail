// TradingViewWidget.jsx
import { getAgent } from "@finos/fdc3"
import { useEffect, useRef, memo, useState } from "react"
import { PolygonMode } from "./common"
import { newsMode } from "./modes/news"

/* eslint-disable  @typescript-eslint/no-explicit-any */

const API_KEY = await getApiKey()

const MODES: PolygonMode[] = [newsMode]

export const PolygonWidget = ({ mode }: { mode: string }) => {
  const container: any = useRef()
  const modeProps = MODES.find((m) => m.name === mode) ?? MODES[0]

  const [state, setState] = useState(modeProps.initialState)
  const [data, setData] = useState(modeProps.initialData)

  useEffect(() => {
    getAgent().then((fdc3) => {
      modeProps.intents.forEach((intent) => {
        fdc3.addIntentListener(intent.name, (context) => {
          const newState = intent.function(context, state)
          setState(() => newState)
          console.log("new state", newState)
        })
      })

      modeProps.listeners.forEach((listener) => {
        fdc3.addContextListener(listener.name, (context) => {
          const newState = listener.function(context, state)
          setState(() => newState)
          console.log("new state", newState)
        })
      })
    })
  }, [state])

  useEffect(() => {
    const call = modeProps.endpoint(state, API_KEY)
    fetch(call).then(async (response) => {
      console.log("response", response)
      const data = await response.json()
      console.log("data", data)
      setData(() => data)
    })
  }, [state])

  return (
    <div id="polygon-widget" ref={container}>
      {modeProps.stateRenderer(state)}
      {modeProps.dataRenderer(data)}
      <div className="polygon-widget-copyright">
        <a
          href="https://www.polygon.io/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text"> Powered by Polygon </span>
        </a>
      </div>
    </div>
  )
}

export default memo(PolygonWidget)

async function getApiKey() {
  const response = await fetch("/polygon-key")
  const data = await response.json()
  return data.key
}
