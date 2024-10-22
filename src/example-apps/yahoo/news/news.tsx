import { createRoot } from "react-dom/client"
import EmbeddedScreen from "./EmbeddedScreen"

const container = document.getElementById("app")
const root = createRoot(container!)

root.render(<EmbeddedScreen />)
