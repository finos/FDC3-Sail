import { type FDC3AppPanel } from "./panel-templates/FDC3IframePanel"

// Simple panel interface for Zustand integration
export interface AppPanel {
  title: string
  url: string
  tabId: string
  panelId: string
  appId: string
  icon: string | null
}

export interface DockviewSailProps {
  theme?: string
  // Optional props for external control (now using Zustand store by default)
  // Note: Store now uses Map<string, AppPanel> for better performance
  externalPanels?: AppPanel[]
  activeTabId?: string
  onPanelAdd?: (panel: FDC3AppPanel) => void
  onPanelRemove?: (panelId: string) => void
}
