import { applyExtensions, SAIL_CONFIG_UI, type SailExtension } from "@finos/sail-extension"

import { DEMO_DEFAULT_SETTINGS, DEMO_SETTINGS_KEY, type DemoSettings } from "./settings"

export const demoExtension: SailExtension = {
  id: "demo",
  title: "Message Log",
  getUIExtensions() {
    return [{ type: SAIL_CONFIG_UI, url: new URL("./ui.tsx", import.meta.url).href }]
  },
  wrapServer(instance, ctx) {
    return applyExtensions(instance, {
      receive: async (message, from) => {
        const settings =
          (await ctx.storage.get<DemoSettings>(DEMO_SETTINGS_KEY)) ?? DEMO_DEFAULT_SETTINGS
        if (settings.enabled && !message.type.startsWith("heartbeat")) {
          instance.log(`[${settings.label}] ${message.type} from ${from}`)
        }
        return instance.receive(message, from)
      },
    })
  },
}

export default demoExtension
