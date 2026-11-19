import { SidebarProvider } from "@/components/ui"

import { AppSidebar } from "./components/sidebar/AppSidebar"
import { ThemeProvider } from "./components/theme/theme-provider"
import { Workspace } from "./components/workspace/Workspace"
import Layout from "./components/layout-grid/Layout"
import { QuickAccessPanel } from "./components/quick-access-panel"
import { IntentResolverDialog } from "./components/intent-resolver"
import { HiddenExtensionHost } from "./components/extensions/HiddenExtensionHost"
import { SailHostAgentProvider } from "./contexts"
import type { SailHostAgent } from "./agent/sail-host-agent"

interface AppProps {
  agent: SailHostAgent
}

function App({ agent }: AppProps) {
  return (
    <SailHostAgentProvider agent={agent}>
      <ThemeProvider>
        <HiddenExtensionHost />
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
    </SailHostAgentProvider>
  )
}

export default App
