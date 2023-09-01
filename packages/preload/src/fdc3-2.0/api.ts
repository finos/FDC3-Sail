import { DesktopAgent as DesktopAgent2_0 } from "fdc3-2.0";
import { DesktopAgent as DesktopAgent1_2 } from "fdc3-1.2";
import { MessagingSupport, SendMessage } from "../message";
import { createAPI as createAPI1_2 } from "../fdc3-1.2/api";
import { createDesktopAgentInstance } from "./desktop-agent";

export function createAPI(sendMessage: SendMessage, ipc: MessagingSupport): DesktopAgent2_0 {

  let out1_2 = createAPI1_2(sendMessage, ipc);
  let out2_0 = createDesktopAgentInstance(sendMessage, "2.0", out1_2, {appId: "unknown"});

  return out2_0;
}