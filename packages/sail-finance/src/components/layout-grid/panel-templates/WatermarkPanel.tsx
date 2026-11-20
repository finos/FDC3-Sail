import { Plus, LayoutGrid, Settings } from "lucide-react"
import { Button, LogoSail } from "@/components/ui"

import { useUIStore } from "../../../stores/ui-store"

export const WatermarkPanel = () => {
  const { openAppDirectory, openExtensionSettings } = useUIStore()

  return (
    <div className="flex size-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 px-4 py-8">
        <LogoSail className="size-40 opacity-80" />

        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold text-foreground">Welcome to Sail</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your Sail workspace for running and connecting financial applications. Get started by
            adding an app to your workspace.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={openAppDirectory} size="lg" className="gap-2">
            <Plus className="size-5" />
            Add App
          </Button>
          <Button onClick={openAppDirectory} variant="outline" size="lg" className="gap-2">
            <LayoutGrid className="size-5" />
            Browse App Directory
          </Button>
          <Button onClick={openExtensionSettings} variant="outline" size="lg" className="gap-2">
            <Settings className="size-5" />
            Extension Settings
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: Configure app directories under Extension Settings if the catalogue is empty
        </p>
      </div>
    </div>
  )
}
