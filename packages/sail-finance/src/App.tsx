import { SidebarProvider } from "@/components/ui"
import type { SailDesktopAgent } from "@finos/sail-desktop-agent"

import { AppSidebar } from "./components/sidebar/AppSidebar"
import { ThemeProvider } from "./components/theme/theme-provider"
import { Workspace } from "./components/workspace/Workspace"
import Layout from "./components/layout-grid/Layout"
import { QuickAccessPanel } from "./components/quick-access-panel"
import { IntentResolverDialog } from "./components/intent-resolver"
import { SailDesktopAgentProvider } from "./contexts"

interface AppProps {
  agent: SailDesktopAgent
}

function App({ agent }: AppProps) {
  return (
    <SailDesktopAgentProvider agent={agent}>
      <ThemeProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <main className="flex flex-1 flex-col overflow-hidden">
            <Workspace>
              <Layout />
            </Workspace>
          </main>
          <QuickAccessPanel />
          <IntentResolverDialog />
        </SidebarProvider>
      </ThemeProvider>
    </SailDesktopAgentProvider>
  )
}

export default App
