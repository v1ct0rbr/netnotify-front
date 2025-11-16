import { Button } from "@/components/ui/button";
import { Building, Inbox, LogOut, Send, User } from "lucide-react";

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
import { type UserInfo } from "@/store/useAuthStore";
import { Link } from "react-router";
import { toast } from "sonner";
import { authService } from "@/services/AuthService";

// Menu items.
const items = [
  {
    title: "Departamentos",
    url: "/departments",
    icon: Building,
    adminOnly: true,
  },

  {
    title: "Mensagens",
    url: "/messages",
    icon: Inbox,
    adminOnly: false,
  },
  {
    title: "Nova Mensagem",
    url: "/new-message",
    icon: Send,
    adminOnly: false,
  },

  {
    title: "Perfil",
    url: "/profile",
    icon: User,
    adminOnly: false,
  }


]

interface AppSidebarProps {
  userInfo?: UserInfo | null;
  logout?: () => void;
}
export function AppSidebar({ userInfo, logout: onLogout }: AppSidebarProps) {

  const isAdmin = authService.isAdmin?.() ?? false;

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

                    {(!item.adminOnly || isAdmin) ? (
                      <Link to={item.url} className="flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-primary dark:hover:text-sidebar-primary">
                        <item.icon className="w-4 h-4 text-inherit" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    ) : null}
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

            </div>
          </div>
          <div className="ml-4">
            <Button



              onClick={() => {

                if (onLogout) onLogout();
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