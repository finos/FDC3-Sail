import type { SailPlatformCatalog, SailUserSession } from "@finos/sail-platform"
import { SidebarProvider } from "@/components/ui"

import { AppSidebar } from "./components/sidebar/AppSidebar"
import { ThemeProvider } from "./components/theme/theme-provider"
import { Workspace } from "./components/workspace/Workspace"
import Layout from "./components/layout-grid/Layout"
import { QuickAccessPanel } from "./components/quick-access-panel"
import { HiddenExtensionHost } from "./components/extensions/HiddenExtensionHost"
import { SailSessionProvider } from "./contexts"

interface AppProps {
  session: SailUserSession
  catalog: SailPlatformCatalog
}

function App({ session, catalog }: AppProps) {
  return (
    <SailSessionProvider session={session} catalog={catalog}>
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
        </SidebarProvider>
      </ThemeProvider>
    </SailSessionProvider>
  )
}

export default App
