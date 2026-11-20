import { type AppPanel } from "./panel-templates/AppIframePanel"

export type { AppPanel }

export interface DockviewSailProps {
  theme?: string
  externalPanels?: AppPanel[]
  activeTabId?: string
  onPanelAdd?: (panel: AppPanel) => void
  onPanelRemove?: (panelId: string) => void
}
