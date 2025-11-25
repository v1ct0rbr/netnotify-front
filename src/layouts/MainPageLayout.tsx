// src/layouts/MainPageLayout.tsx


import { AppSidebar } from "@/components/app-sidebar";
import { Footer } from "@/components/footer";
import Header from "@/components/header";
import {
    SidebarProvider,
} from '@/components/ui/sidebar';
import { useAuthStore } from "@/store/useAuthStore";
import Cookies from 'js-cookie';

import React, { useEffect } from "react";
import { Outlet, useMatches, useNavigate } from "react-router-dom";

interface MainPageLayoutProps {
    pageTitle: string;
}

export default function MainPageLayout({ pageTitle }: MainPageLayoutProps): React.ReactElement {

    const { logout, user } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        console.log('Iniciando logout...');
        await logout();
        console.log('Logout concluído, redirecionando para /login');
        navigate('/');
    };

    // Extrair username do token JWT armazenado (para debug)
    useEffect(() => {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                const username = decoded.preferred_username || decoded.sub || null;
                console.log("Usuario autenticado:", username);
            }
        } catch (error) {
            console.error("Erro ao extrair username do token:", error);
        }
    }, []);



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
            <AppSidebar userInfo={user} logout={handleLogout} />
            <main className="w-full">
                <Header title={titleToShow} />

                {/* Header will contain the SidebarTrigger and ModeToggle */}
                <Outlet />
                <Footer />
            </main>

        </SidebarProvider>
    );
}
//  

