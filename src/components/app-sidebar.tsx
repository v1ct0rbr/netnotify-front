import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";

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
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
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
          <button
            className="ml-4 text-xs text-red-600 hover:underline"
            onClick={() => {
              // Adicione aqui a lógica de logout
              if (!userInfo) return;
              if (logout) logout();
              toast.success('Logout realizado com sucesso!');
            }}
          >
            Sair
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}