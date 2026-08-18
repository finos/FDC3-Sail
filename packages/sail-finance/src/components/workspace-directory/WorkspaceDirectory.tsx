import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { LayoutGrid, ExternalLink, Play } from "lucide-react"

import type { AppPanel } from "../layout-grid/types"

interface WorkspaceLayout {
  id: string
  name: string
  description?: string
  tabs: {
    tabId: string
    name: string
    panels: AppPanel[]
  }[]
  createdAt: Date
  lastModified: Date
}

interface WorkspaceCardProps {
  workspace: WorkspaceLayout
  onWorkspaceClick: (workspace: WorkspaceLayout) => void
}

const WorkspaceCard = ({ workspace, onWorkspaceClick }: WorkspaceCardProps) => {
  const uniqueApps = new Set(workspace.tabs.flatMap(tab => tab.panels.map(panel => panel.appId)))
    .size

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      onClick={() => onWorkspaceClick(workspace)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-md">
              <LayoutGrid className="text-primary size-5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1 text-sm font-medium">{workspace.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-2 py-1 text-xs">
                {workspace.tabs.length} tab{workspace.tabs.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs">
                {uniqueApps} app{uniqueApps !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Play className="text-muted-foreground size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="mb-3 line-clamp-2 text-xs">
          {workspace.description || "No description available"}
        </CardDescription>

        <div className="space-y-2">
          {workspace.tabs.slice(0, 2).map(tab => (
            <div key={tab.tabId} className="text-xs">
              <div className="text-foreground mb-1 font-medium">{tab.name}</div>
              <div className="flex flex-wrap gap-1">
                {tab.panels.slice(0, 3).map(panel => (
                  <div
                    key={panel.panelId}
                    className="bg-muted inline-flex items-center gap-1 rounded-sm px-2 py-1"
                  >
                    {panel.icon && (
                      <img
                        src={panel.icon}
                        alt=""
                        className="size-3 rounded-sm"
                        onError={e => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    )}
                    <span className="max-w-[80px] truncate">{panel.title}</span>
                    {panel.url && <ExternalLink className="text-muted-foreground size-2" />}
                  </div>
                ))}
                {tab.panels.length > 3 && (
                  <div className="bg-muted/50 text-muted-foreground inline-flex items-center rounded-sm px-2 py-1">
                    +{tab.panels.length - 3}
                  </div>
                )}
              </div>
            </div>
          ))}
          {workspace.tabs.length > 2 && (
            <div className="text-muted-foreground text-xs">
              +{workspace.tabs.length - 2} more tab{workspace.tabs.length - 2 !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="text-muted-foreground mt-3 text-xs">
          Modified {workspace.lastModified.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}

const MOCK_WORKSPACES: WorkspaceLayout[] = [
  {
    id: "trading-setup",
    name: "Trading Setup",
    description: "Complete trading environment with market data, charts, and news feeds",
    tabs: [
      {
        tabId: "primary",
        name: "Primary",
        panels: [
          {
            title: "TradingView Chart",
            url: "https://tradingview.com/chart/",
            tabId: "primary",
            panelId: "tradingview-1",
            appId: "tradingview",
            icon: null,
          },
          {
            title: "Market Data",
            url: "https://polygon.io/dashboard",
            tabId: "primary",
            panelId: "polygon-1",
            appId: "polygon",
            icon: null,
          },
        ],
      },
      {
        tabId: "analysis",
        name: "Analysis",
        panels: [
          {
            title: "News Feed",
            url: "https://benzinga.com/news",
            tabId: "analysis",
            panelId: "benzinga-1",
            appId: "benzinga",
            icon: null,
          },
        ],
      },
    ],
    createdAt: new Date("2024-01-15"),
    lastModified: new Date("2024-01-20"),
  },
  {
    id: "research-workspace",
    name: "Research Workspace",
    description: "Financial research and analysis tools",
    tabs: [
      {
        tabId: "main",
        name: "Main",
        panels: [
          {
            title: "Financial Reports",
            url: "https://sec.gov/edgar",
            tabId: "main",
            panelId: "edgar-1",
            appId: "edgar",
            icon: null,
          },
          {
            title: "Company Analytics",
            url: "https://morningstar.com",
            tabId: "main",
            panelId: "morningstar-1",
            appId: "morningstar",
            icon: null,
          },
          {
            title: "Economic Calendar",
            url: "https://tradingeconomics.com/calendar",
            tabId: "main",
            panelId: "calendar-1",
            appId: "economic-calendar",
            icon: null,
          },
        ],
      },
    ],
    createdAt: new Date("2024-01-10"),
    lastModified: new Date("2024-01-18"),
  },
  {
    id: "portfolio-management",
    name: "Portfolio Management",
    description: "Portfolio tracking and risk management tools",
    tabs: [
      {
        tabId: "overview",
        name: "Overview",
        panels: [
          {
            title: "Portfolio Tracker",
            url: "https://example.com/portfolio",
            tabId: "overview",
            panelId: "portfolio-1",
            appId: "portfolio-tracker",
            icon: null,
          },
        ],
      },
      {
        tabId: "risk",
        name: "Risk Analysis",
        panels: [
          {
            title: "Risk Monitor",
            url: "https://example.com/risk",
            tabId: "risk",
            panelId: "risk-1",
            appId: "risk-monitor",
            icon: null,
          },
          {
            title: "Compliance Dashboard",
            url: "https://example.com/compliance",
            tabId: "risk",
            panelId: "compliance-1",
            appId: "compliance",
            icon: null,
          },
        ],
      },
    ],
    createdAt: new Date("2024-01-12"),
    lastModified: new Date("2024-01-22"),
  },
]

export function WorkspaceDirectory() {
  const handleWorkspaceClick = (workspace: WorkspaceLayout) => {
    console.log("Workspace clicked:", workspace)
    // TODO: Implement workspace loading logic
    // This would restore the dockview layout with the workspace's panels
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground">
          Saved layouts and configurations ({MOCK_WORKSPACES.length} available)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_WORKSPACES.map(workspace => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            onWorkspaceClick={handleWorkspaceClick}
          />
        ))}
      </div>
    </div>
  )
}
