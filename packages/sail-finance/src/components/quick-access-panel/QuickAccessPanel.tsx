import { Sheet, SheetContent } from "@/components/ui"

import { AppDirectory } from "../app-directory/AppDirectory"
import { WorkspaceDirectory } from "../workspace-directory/WorkspaceDirectory"
import { useUIStore, type QuickAccessPanelContent } from "../../stores/ui-store"

const QuickAccessContent = ({ content }: { content: QuickAccessPanelContent }) => {
  switch (content) {
    case "app-directory":
      return <AppDirectory />
    case "workspace-directory":
      return <WorkspaceDirectory />
    default:
      return null
  }
}

export function QuickAccessPanel() {
  const { activeQuickAccessPanel, closeQuickAccessPanel } = useUIStore()

  const isOpen = activeQuickAccessPanel !== null

  return (
    <Sheet open={isOpen} onOpenChange={closeQuickAccessPanel}>
      <SheetContent side="left" className="w-full overflow-y-auto p-0 sm:max-w-none">
        <QuickAccessContent content={activeQuickAccessPanel} />
      </SheetContent>
    </Sheet>
  )
}
