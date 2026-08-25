import type { BrowserTypes } from "@finos/fdc3"

type IframeHello = BrowserTypes.Fdc3UserInterfaceHello

export function connectUserInterfacePort(
  implementationDetails: string,
  initialCSS: Record<string, string | number>,
): MessagePort {
  const parent = window.parent
  const mc = new MessageChannel()
  const myPort = mc.port1
  myPort.start()

  const hello: IframeHello = {
    type: "Fdc3UserInterfaceHello",
    payload: { initialCSS, implementationDetails },
  }

  // nosemgrep
  parent.postMessage(hello, "*", [mc.port2])
  return myPort
}

export function postIframeRestyle(
  port: MessagePort,
  updatedCSS: Record<string, string | number>,
): void {
  port.postMessage({
    type: "Fdc3UserInterfaceRestyle",
    payload: { updatedCSS },
  })
}
