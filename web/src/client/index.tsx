import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import { getClientState } from "./state/clientState"
import { getAppState } from "./state/AppState"
import "../../static/fonts/DM_Sans/DM_Sans.css"
import { getServerState } from "./state/ServerState"

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

getAppState().init()
