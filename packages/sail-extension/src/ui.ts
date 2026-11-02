import type { ComponentType } from "react"
import { SAIL_CONFIG_UI } from "./types"
import type { SailExtensionStorage } from "./types"

export { SAIL_CONFIG_UI }

export type SailExtensionConfigProps = {
  storage: SailExtensionStorage
}

export type SailExtensionUI = {
  id: string
  title: string
  type: string
  ConfigScreen: ComponentType<SailExtensionConfigProps>
  mount?(el: HTMLElement, props: SailExtensionConfigProps): () => void
}
