import { useEffect, useMemo, useRef, useState } from "react"
import { SAIL_UI_CONFIG } from "@finos/sail-platform"
import type { SailExtensionUI } from "@finos/sail-extension/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { cn } from "@/lib/utils"
import { createSailFinanceExtensionStorage } from "../../state/extension-storage"
import {
  getExtensionExport,
  getLoadedExtensionUIs,
  loadExtensionUIs,
} from "../../state/extensions-runtime"

import "./extension-settings.css"

function ExtensionUiMount({ ui }: { ui: SailExtensionUI }) {
  const host = useRef<HTMLDivElement>(null)
  const storage = useMemo(() => createSailFinanceExtensionStorage(ui.id), [ui.id])
  const props = useMemo(
    () => ({ storage, getExport: getExtensionExport }),
    [storage],
  )

  useEffect(() => {
    const el = host.current
    if (!el) {
      return
    }
    return ui.mount(el, props)
  }, [ui, props])

  return <div ref={host} className="sail-extension-ui" />
}

/**
 * Tabbed host for sail.ui.config contributions (same shape as sail-one settings).
 * Host CSS under `.sail-extension-ui` themes the extensions' unstyled form chrome.
 */
export function ExtensionSettings() {
  const [uis, setUis] = useState<SailExtensionUI[]>([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    void loadExtensionUIs().then(() => {
      setUis(getLoadedExtensionUIs(SAIL_UI_CONFIG))
    })
  }, [])

  useEffect(() => {
    if (activeId || uis.length === 0) {
      return
    }
    const directories = uis.find(ui => /director/i.test(ui.title))
    setActiveId(directories?.id ?? uis[0]!.id)
  }, [uis, activeId])

  if (uis.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No extension settings</CardTitle>
            <CardDescription>
              Check host <code className="text-xs">extensions.json</code> and that the Sail
              extensions Vite plugin is enabled.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const active = uis.find(ui => ui.id === activeId) ?? uis[0]!

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mb-6 shrink-0">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Extension Settings</h1>
        <p className="text-muted-foreground">Configure loaded extensions</p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <nav
          className="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto"
          aria-label="Extension settings"
        >
          {uis.map(ui => {
            const selected = ui.id === active.id
            return (
              <button
                type="button"
                key={ui.id}
                onClick={() => setActiveId(ui.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-transparent shadow-xs"
                    : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {ui.title}
              </button>
            )
          })}
        </nav>

        <Card className="min-h-0 min-w-0 flex-1 overflow-hidden py-0">
          <CardHeader className="border-border border-b py-4">
            <CardTitle className="text-base">{active.title}</CardTitle>
            <CardDescription className="font-mono text-xs">{active.id}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto py-4">
            <ExtensionUiMount key={active.id} ui={active} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
