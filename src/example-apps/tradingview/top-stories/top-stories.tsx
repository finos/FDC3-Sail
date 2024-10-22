import { createRoot } from "react-dom/client";
import TradingViewWidget from "./TradingViewWidget";

const container = document.getElementById("app");
const root = createRoot(container!);

root.render(<TradingViewWidget />);
