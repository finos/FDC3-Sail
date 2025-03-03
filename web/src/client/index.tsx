import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import {
  getClientState,
  getAppState,
  getServerState,
} from "@finos/fdc3-sail-common"
import "../../static/fonts/DM_Sans/DM_Sans.css"

const container = document.getElementById("app")
const root = createRoot(container!)
root.render(<Frame cs={getClientState()} as={getAppState()} />)

getClientState().addStateChangeCallback(() => {
  root.render(<Frame cs={getClientState()} as={getAppState()} />)
})

getAppState().addStateChangeCallback(() => {
  root.render(<Frame cs={getClientState()} as={getAppState()} />)
})

getServerState().registerDesktopAgent(getClientState().createArgs())

getAppState().init(getServerState(), getClientState())
