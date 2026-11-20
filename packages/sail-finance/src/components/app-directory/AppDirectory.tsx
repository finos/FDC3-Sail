import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { ExternalLink } from "lucide-react"
import type { IDockviewPanelProps } from "dockview-react"
import type { SailApp, SailWebApp } from "@finos/sail-platform"

import { useAppDirectoryStore, useSailSession } from "../../contexts"
import { useUIStore } from "../../stores/ui-store"

import { ChooseAppIcon } from "./ChooseAppIcon"

interface AppCardProps {
  app: SailApp
  onAppClick: (app: SailApp) => void
}

function catalogUrl(app: SailApp): string | null {
  const url = (app as SailWebApp).url
  return typeof url === "string" && url.length > 0 ? url : null
}

const AppCard = ({ app, onAppClick }: AppCardProps) => {
  const [imageError, setImageError] = useState(false)
  const iconUrl = app.icon || null
  const showFallback = !iconUrl || imageError
  const url = catalogUrl(app)

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
              {app.title || app.appId}
            </CardTitle>
            {url && (
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
  const session = useSailSession()
  const { apps, isLoading, error, loadApps, refreshApps } = useAppDirectoryStore()
  const { closeQuickAccessPanel } = useUIStore()

  useEffect(() => {
    void loadApps()
  }, [loadApps])

  const handleAppClick = (app: SailApp) => {
    const url = catalogUrl(app)
    if (!url) {
      console.warn("App has no launch URL in catalogue:", app)
      return
    }

    closeQuickAccessPanel()

    // Session open → host mountApp adds the workspace panel; Layout syncs Dockview.
    // Bypassing session (homemade instance ids) breaks agent handshake + app-bar state.
    void session
      .openApp({
        appId: app.appId,
        url,
        title: app.title || app.appId,
        icon: app.icon,
      })
      .then(() => {
        if (!panelProps) {
          return
        }
        const directoryPanel = panelProps.containerApi.getPanel(panelProps.api.id)
        if (directoryPanel) {
          panelProps.containerApi.removePanel(directoryPanel)
        }
      })
      .catch((err: unknown) => {
        console.error(`[Sail] Failed to open ${app.appId}`, err)
      })
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
              No applications are currently available in the catalogue.
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
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">App Catalogue</h1>
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
