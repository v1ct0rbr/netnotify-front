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
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authService } from "@/services/AuthService";
import { type UserInfo } from "@/store/useAuthStore";
import {
  Building,
  CalendarClock,
  Cpu,
  Database,
  Home,
  Inbox,
  LogOut,
  Send,
  User,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

type SidebarItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    label: "Principal",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
      },
    ],
  },
  {
    label: "Mensagens",
    items: [
      {
        title: "Nova Mensagem",
        url: "/new-message?new=true",
        icon: Send,
      },
      {
        title: "Mensagens",
        url: "/messages",
        icon: Inbox,
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        title: "Departamentos",
        url: "/departments",
        icon: Building,
        adminOnly: true,
      },
      {
        title: "Expediente",
        url: "/office-hours-admin",
        icon: CalendarClock,
        adminOnly: true,
      },
      {
        title: "Agentes Conectados",
        url: "/rabbit-agents",
        icon: Cpu,
        adminOnly: true,
      },
      {
        title: "Cache",
        url: "/cache-admin",
        icon: Database,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Conta",
    items: [
      {
        title: "Perfil",
        url: "/profile",
        icon: User,
      },
    ],
  },
];

interface AppSidebarProps {
  userInfo?: UserInfo | null;
  logout?: () => void;
}

export function AppSidebar({ userInfo, logout: onLogout }: AppSidebarProps) {
  const isAdmin = authService.isAdmin?.() ?? false;

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="text-lg font-bold">NetNotify</span>
      </SidebarHeader>

      <SidebarContent>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className="flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-primary dark:hover:text-sidebar-primary"
                      >
                        <item.icon className="w-4 h-4 text-inherit" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
  );
}
