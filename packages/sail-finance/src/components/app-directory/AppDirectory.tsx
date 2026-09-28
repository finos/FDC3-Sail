import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { ExternalLink } from "lucide-react"
import type { IDockviewPanelProps } from "dockview-react"

import { useAppDirectoryStore } from "../../contexts"
import { useUIStore } from "../../stores/ui-store"
import { useWorkspaceStore } from "../../stores/workspace-store"
import type { DirectoryApp, WebAppDetails } from "../../types/common"

import { ChooseAppIcon } from "./ChooseAppIcon"
import { FDC3_PANEL_RENDERER } from "../layout-grid/dockview-options"

interface AppCardProps {
  app: DirectoryApp
  onAppClick: (app: DirectoryApp) => void
}

const AppCard = ({ app, onAppClick }: AppCardProps) => {
  const [imageError, setImageError] = useState(false)

  const getAppIconUrl = (app: DirectoryApp): string | null => {
    if (app.icons && app.icons.length > 0 && app.icons[0]!.src) {
      return app.icons[0]!.src
    }
    return null
  }

  const iconUrl = getAppIconUrl(app)
  const showFallback = !iconUrl || imageError

  const getAppUrl = (app: DirectoryApp) => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 App Directory JSON: DirectoryApp.details is typed required, but a directory entry's JSON can still omit it
    if (app.type === "web" && app.details) {
      return (app.details as WebAppDetails).url
    }
    return null
  }

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      onClick={() => onAppClick(app)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {!showFallback ? (
              <img
                src={iconUrl}
                alt={`${app.title} icon`}
                className="size-10 rounded-md object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <ChooseAppIcon size={40} className="size-10 rounded-md" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1 text-sm font-medium">
              {app.title || app.name || app.appId}
            </CardTitle>
            {app.type === "web" && getAppUrl(app) && (
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <ExternalLink className="size-3" />
                <span className="truncate">Web App</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="line-clamp-3 text-xs">
          {app.description || "No description available"}
        </CardDescription>
        {app.version && (
          <div className="text-muted-foreground mt-2 text-xs">Version {app.version}</div>
        )}
      </CardContent>
    </Card>
  )
}

const AppDirectorySkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <Card key={index} className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-md" />
            <div className="flex-1">
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="mb-1 h-3 w-full" />
          <Skeleton className="mb-1 h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-2 h-3 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
)

interface AppDirectoryProps {
  panelProps?: IDockviewPanelProps
}

export function AppDirectory({ panelProps }: AppDirectoryProps) {
  const { apps, isLoading, error, loadApps, refreshApps } = useAppDirectoryStore()
  const { addPanel, workspaces, activeWorkspaceId } = useWorkspaceStore()
  const { closeQuickAccessPanel } = useUIStore()
  const activeWorkspace = workspaces.get(activeWorkspaceId)
  const activeTabId = activeWorkspace?.layout.activeTabId || ""

  // Fetch app directory from desktop agent once on mount
  useEffect(() => {
    loadApps()
  }, [loadApps])

  const handleAppClick = (app: DirectoryApp) => {
    console.log("App clicked:", app)

    // oxlint-disable-next-line typescript/no-unnecessary-condition -- FDC3 App Directory JSON: DirectoryApp.details is typed required, but a directory entry's JSON can still omit it
    if (app.type !== "web" || !app.details) {
      console.warn("App is not a web app or has no details:", app)
      return
    }

    const webDetails = app.details as WebAppDetails

    // Generate unique panel ID and instance title
    const instanceId = `${app.appId}-${Date.now()}`
    const instanceTitle = app.title || app.name || app.appId

    // Add to the workspace store - Layout will sync this to Dockview
    if (activeWorkspaceId && activeTabId) {
      addPanel(activeWorkspaceId, activeTabId, {
        panelId: instanceId,
        appId: app.appId,
        title: instanceTitle,
        url: webDetails.url,
        icon: app.icons?.[0]?.src || null,
      })
    }

    // If we have panelProps (opened from within Dockview), also add directly to the same group
    // and close this directory panel
    if (panelProps) {
      const fdc3Panel = {
        title: instanceTitle,
        url: webDetails.url,
        tabId: activeTabId,
        panelId: instanceId,
        appId: app.appId,
        icon: app.icons?.[0]?.src || null,
      }

      // Add the new FDC3 panel as a tab in the same group
      const currentGroup = panelProps.api.group
      panelProps.containerApi.addPanel({
        id: instanceId,
        component: "fdc3",
        tabComponent: "fdc3Tab",
        title: instanceTitle,
        params: { panel: fdc3Panel },
        renderer: FDC3_PANEL_RENDERER,
        position: {
          referenceGroup: currentGroup,
        },
      })

      // Close this directory panel after adding the app
      setTimeout(() => {
        const directoryPanel = panelProps.containerApi.getPanel(panelProps.api.id)
        if (directoryPanel) {
          panelProps.containerApi.removePanel(directoryPanel)
        }
      }, 100)
    }

    // Close the quick access panel if it's open
    closeQuickAccessPanel()
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Apps</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">{error}</CardDescription>
            <button
              onClick={() => void refreshApps()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return <AppDirectorySkeleton />
  }

  if (apps.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Apps Available</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              No applications are currently available in the directory.
            </CardDescription>
            <button
              onClick={() => void refreshApps()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">App Directory</h1>
        <p className="text-muted-foreground">
          Browse and launch applications ({apps.length} available)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {apps.map(app => (
          <AppCard key={String(app.appId)} app={app} onAppClick={handleAppClick} />
        ))}
      </div>
    </div>
  )
}
