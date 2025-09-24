import { Calendar, Home, Inbox, LogOut, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  SidebarMenuItem
} from "@/components/ui/sidebar";
import type { User } from "@/store/useAuthStore";
import { toast } from "sonner";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
 
]

interface AppSidebarProps {
  userInfo?: User | null;
  logout?: () => void;
}
export function AppSidebar( { userInfo, logout }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
       
        <span className="text-lg font-bold">NetNotify</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-primary dark:hover:text-sidebar-primary">
                      <item.icon className="w-4 h-4 text-inherit" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between w-full px-3 py-2">
          <div className="flex items-center space-x-2">
            
            <div>
              <div className="text-sm font-medium">{userInfo?.fullName}</div>
              <div className="text-xs text-muted-foreground">{userInfo?.email}</div>
            </div>
          </div>
          <div className="ml-4">
            <Button
              size="sm"
              className="btn-primary"
              onClick={() => {
                if (!userInfo) return;
                if (logout) logout();
                toast.success("Logout realizado com sucesso!");
              }}
            >
              <LogOut className="mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}