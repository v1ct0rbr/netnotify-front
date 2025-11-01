import { Button } from "@/components/ui/button";
import { Inbox, LogOut, Send } from "lucide-react";

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

// Menu items.
const items = [
  {
    title: "Nova Mensagem",
    url: "/",
    icon: Send,
  },
  {
    title: "Mensagens",
    url: "/messages",
    icon: Inbox,
  },
 
]

interface AppSidebarProps {
  userInfo?: UserInfo | null;
  logout?: () => void;
}
export function AppSidebar( { userInfo, logout: onLogout }: AppSidebarProps) {

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
                    
                    <Link to={item.url} className="flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-primary dark:hover:text-sidebar-primary">
                      <item.icon className="w-4 h-4 text-inherit" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
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