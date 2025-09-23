// src/layouts/MainPageLayout.tsx


import { AppSidebar } from "@/components/app-sidebar";
import { Loader } from "@/components/ui/loader";
import {
    SidebarProvider,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { useAuthStore } from "@/store/useAuthStore";
import Cookies from 'js-cookie';
import { PanelLeftIcon } from "lucide-react";
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";

type MainProps = React.HTMLAttributes<HTMLElement> & {
    ref?: React.Ref<HTMLElement>
}

export default function MainPageLayout({ className, ...props }: MainProps) {

    const user = useAuthStore((s) => s.user);
    const isChecking = useAuthStore((s) => s.isChecking);
    // const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    // Usa função estável do zustand
    const checkAuth = React.useRef(useAuthStore.getState().checkAuth);
    const navigate = useNavigate();

    const [isDark, setIsDark] = React.useState<boolean>(() => {
        try {
            const stored = localStorage.getItem('theme');
            if (stored) return stored === 'dark';
            const cookie = Cookies.get('theme');
            if (cookie) return cookie === 'dark';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch {
            return false;
        }
    });

    React.useEffect(() => {
        try {
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            Cookies.set('theme', isDark ? 'dark' : 'light', { expires: 365 });
        } catch {
            // ignore
        }
    }, [isDark]);

    // Chama checkAuth apenas uma vez ao montar
    React.useEffect(() => {
        console.debug('[layout] mount: user, isChecking, token:', user, isChecking, localStorage.getItem('token'));
        checkAuth.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Redireciona para login se não houver token e não estiver autenticado.
    // Isso evita redirecionar prematuramente durante a verificação (refresh com token)
    React.useEffect(() => {
        if (isChecking) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.debug('[layout] redirect check: user, isChecking, token:', user, isChecking, token);
        if (!token) {
            navigate('/auth/login');
        }
        // se houver token mas user ainda não, aguardamos a checkAuth
    }, [isChecking, user, navigate]);

    if (isChecking) return <Loader className="h-24" />; // mostrar loader durante verificação

    const logout = useAuthStore.getState().logout;

    return (
     

         <SidebarProvider>
            <AppSidebar userInfo={user} logout={logout} />
              <main className="w-full flex flex-1">
                <SidebarTrigger className="hover:bg-none focus:bg-none focus:ring-0" />                

                <Outlet />
              </main>
            </SidebarProvider>
          );
      } 
//     // Listen for popstate events (back/forward navigation)
//     window.addEventListener("popstate", handleLocationChange);
//     // Set initial path
//     handleLocationChange();
//     // Cleanup listener on unmount
//     return () => {
//         window.removeEventListener("popstate", handleLocationChange);
//     };
// }, []);

