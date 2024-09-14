import { createRoot } from "react-dom/client";
import { TradingViewWidget } from "./TradingViewWidget";
import { getAgent } from "@kite9/fdc3";

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(<TradingViewWidget />);

window.onload = async () => {
  const fdc3 = await getAgent();
};
