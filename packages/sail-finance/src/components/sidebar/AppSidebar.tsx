import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui"
import { Home, Zap, Settings, ChevronUp, User2, LayoutGrid } from "lucide-react"
import { LogoSail } from "@/components/ui"
import React from "react"

import { ModeToggle } from "../theme/ModeToggle"
import { useUIStore } from "../../stores/ui-store"

interface SidebarItem {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  action: {
    type: "url" | "handler"
    value: string | (() => void)
  }
}

export function AppSidebar() {
  const { openAppDirectory, openWorkspaceDirectory } = useUIStore()
  const { setOpen } = useSidebar()

  const handleAppsClick = () => {
    openAppDirectory()
    setOpen(false) // Close sidebar when opening app directory
  }

  const handleWorkspacesClick = () => {
    openWorkspaceDirectory()
    setOpen(false) // Close sidebar when opening workspace directory
  }

  const items: SidebarItem[] = [
    {
      title: "Dashboard",
      icon: Home,
      action: { type: "url", value: "#" },
    },
    {
      title: "Apps",
      icon: Zap,
      action: { type: "handler", value: handleAppsClick },
    },
    {
      title: "Workspaces",
      icon: LayoutGrid,
      action: { type: "handler", value: handleWorkspacesClick },
    },
    {
      title: "Settings",
      icon: Settings,
      action: { type: "url", value: "#" },
    },
  ]

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <ModeToggle />
        <LogoSail className="w-30 h-30" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={
                      item.action.type === "handler" ? (item.action.value as () => void) : undefined
                    }
                    asChild={item.action.type === "url"}
                  >
                    {item.action.type === "handler" ? (
                      <>
                        <item.icon />
                        <span>{item.title}</span>
                      </>
                    ) : (
                      <a href={item.action.value as string}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User2 />
              <span>User</span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
