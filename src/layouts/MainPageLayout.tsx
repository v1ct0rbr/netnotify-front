// src/layouts/MainPageLayout.tsx


import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/header";
import { Loader } from "@/components/ui/loader";
import {
    SidebarProvider,
    
} from '@/components/ui/sidebar';
import { useAuthStore } from "@/store/useAuthStore";
import Cookies from 'js-cookie';
 
import React from "react";
import { Outlet, useNavigate, useMatches } from "react-router-dom";

interface MainPageLayoutProps {
    pageTitle: string;
}

export default function MainPageLayout({ pageTitle }: MainPageLayoutProps): React.ReactElement {

    const user = useAuthStore((s) => s.user);
    const isChecking = useAuthStore((s) => s.isChecking);
    // const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    // Usa função estável do zustand
    const checkAuth = React.useRef(useAuthStore.getState().checkAuth);
    const navigate = useNavigate();

    const [isDark] = React.useState<boolean>(() => {
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
        // read the matched routes and prefer the innermost handle.pageTitle when available
        const matches = useMatches();
        const routeTitle = React.useMemo(() => {
            // iterate from last (most specific) to first
            for (let i = matches.length - 1; i >= 0; i--) {
                const m = matches[i];
                // handle may be undefined
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (m && m.handle && m.handle.pageTitle) return m.handle.pageTitle as string;
            }
            return undefined;
        }, [matches]);

        const titleToShow = routeTitle ?? pageTitle;

        // update the document title to match the route's pageTitle
        React.useEffect(() => {
            try {
                if (typeof document !== "undefined") {
                    document.title = `${titleToShow} - NetNotify`;
                }
            } catch {
                // ignore in environments without document
            }
        }, [titleToShow]);

        if (isChecking) return <Loader className="h-24" />; // mostrar loader durante verificação

        const logout = useAuthStore.getState().logout;

        return (


        <SidebarProvider>
            <AppSidebar userInfo={user} logout={logout} />
            <main className="w-full">
            <Header title={titleToShow} />
                
                {/* Header will contain the SidebarTrigger and ModeToggle */}
                <Outlet />
            </main>
        </SidebarProvider>
    );
}
//  

