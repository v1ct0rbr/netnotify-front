// src/layouts/MainPageLayout.tsx


import { AppSidebar } from "@/components/app-sidebar";
import Header from "@/components/header";
import {
    SidebarProvider,
} from '@/components/ui/sidebar';
import { useKeycloak } from "@react-keycloak/web";
import Cookies from 'js-cookie';
 
import React, { useEffect } from "react";
import { Outlet, useMatches } from "react-router-dom";

interface MainPageLayoutProps {
    pageTitle: string;
}

export default function MainPageLayout({ pageTitle }: MainPageLayoutProps): React.ReactElement {

    const { keycloak } = useKeycloak();
    const user = keycloak?.tokenParsed?.preferred_username;

    // ✅ NÃO chama keycloak?.login() aqui!
    // O Keycloak Provider já redireciona automaticamente se não autenticado
    // Se precisar fazer algo quando autenticado, faça aqui
    useEffect(() => {
        if (keycloak?.authenticated) {
            console.log("✅ Usuário autenticado:", user);
            // Aqui você pode fazer outras coisas, como carregar dados do usuário
        }
    }, [keycloak?.authenticated, user]);

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

    
        return (
            <SidebarProvider>
                <AppSidebar userInfo={user} logout={keycloak?.logout} />
                <main className="w-full">
                <Header title={titleToShow} />
                    
                    {/* Header will contain the SidebarTrigger and ModeToggle */}
                    <Outlet />
                </main>
            </SidebarProvider>
    );
}
//  

