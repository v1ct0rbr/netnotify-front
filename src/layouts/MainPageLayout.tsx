// src/layouts/MainPageLayout.tsx


import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader } from "@/components/ui/loader";
import Cookies from 'js-cookie';
import { Menu, Sun, Moon, Home, LogOut } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
            <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button className="p-2 rounded-md bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-150 ease-in-out" aria-label="Toggle sidebar">
                            <Menu className="w-5 h-5 transition-colors duration-150 ease-in-out" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">NetNotify</h1>
                            <span className="text-xs text-slate-500 dark:text-slate-300">Painel Administrativo</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDark(prev => !prev)}
                            className="p-2 rounded-md bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-150 ease-in-out"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Moon className="w-5 h-5 transition-colors duration-150 ease-in-out" /> : <Sun className="w-5 h-5 transition-colors duration-150 ease-in-out" />}
                        </button>
                        <div className="text-right">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{user?.fullName ?? user?.username ?? 'Usuário'}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">{user?.email ?? ''}</div>
                        </div>
                        <button onClick={() => { logout(); navigate('/auth/login'); }} className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Logout</button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                <aside className="hidden md:block bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3 h-fit shadow-sm">
                    <nav className="flex flex-col gap-2">
                        <button onClick={() => navigate('/')} className="text-sm p-2 rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-slate-200 flex items-center gap-2 transition-colors duration-150 ease-in-out">
                            <Home className="w-4 h-4 transition-colors duration-150 ease-in-out" />
                            Home
                        </button>
                        <button onClick={() => { logout(); navigate('/auth/login'); }} className="text-sm p-2 rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-200 hover:bg-slate-700 dark:hover:bg-slate-200 flex items-center gap-2 transition-colors duration-150 ease-in-out">
                            <LogOut className="w-4 h-4 transition-colors duration-150 ease-in-out" />
                            Logout
                        </button>
                    </nav>
                </aside>

                <main className={cn('rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm', className)} {...props}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
//     };
//     // Listen for popstate events (back/forward navigation)
//     window.addEventListener("popstate", handleLocationChange);
//     // Set initial path
//     handleLocationChange();
//     // Cleanup listener on unmount
//     return () => {
//         window.removeEventListener("popstate", handleLocationChange);
//     };
// }, []);

