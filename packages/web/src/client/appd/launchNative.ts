import {
  FDC3_WEBSOCKET_PROPERTY,
  getClientState,
  openCustomProtocolUrl,
  resolveNativeLaunchUrl,
} from "@finos/fdc3-sail-common"
import { DirectoryApp } from "@finos/fdc3-sail-da-impl"

function getNativeLaunchUrl(app: DirectoryApp): string | undefined {
  const url = (app.details as { url?: string })?.url
  return url && url.length > 0 ? url : undefined
}

export function hasDesktopLaunchUrl(app: DirectoryApp): boolean {
  return app.type === "native" && getNativeLaunchUrl(app) != null
}

export async function launchNativeAppOnDesktop(
  app: DirectoryApp,
): Promise<void> {
  const launchUrl = getNativeLaunchUrl(app)
  const webSocketUrl = (app.details as Record<string, string | undefined>)[
    FDC3_WEBSOCKET_PROPERTY
  ]
  if (!launchUrl || !app.appId || !webSocketUrl) {
    throw new Error("Native app is missing launch URL or WebSocket endpoint")
  }

  const pairing = await getClientState().mintWscpPairing(app.appId)
  const url = resolveNativeLaunchUrl(
    launchUrl,
    webSocketUrl,
    pairing.sharedSecret,
  )
  openCustomProtocolUrl(url)
}
