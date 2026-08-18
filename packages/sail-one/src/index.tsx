import "./styles/global.css"
import { Frame } from "./frame/frame"
import { createRoot } from "react-dom/client"
import { getClientState, getServerState, bindClientStateToHost } from "./state"
import { useSailState } from "./state/use-sail-state"

function App() {
  useSailState()
  return <Frame cs={getClientState()} />
}

async function bootstrap(): Promise<void> {
  // Platform storage is async, so hydrate before first render — otherwise the
  // Desktop Agent would be seeded with default channels and then immediately
  // restarted when the persisted set arrived.
  await getClientState().load()

  const container = document.getElementById("app")
  const root = createRoot(container!)
  root.render(<App />)

  bindClientStateToHost()
  await getServerState().registerDesktopAgent(getClientState().createArgs())
}

void bootstrap().catch((e: unknown) => {
  console.error("Failed to start Sail", e)
})
