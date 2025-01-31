import { contextBridge } from "electron";
import { fdc3 } from "./DesktopAgentProxy";

window.onload = () => {
    console.log("ON LOAD CALLED");
    contextBridge.exposeInMainWorld('fdc3', fdc3)
}