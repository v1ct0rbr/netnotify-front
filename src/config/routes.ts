// src/routes.ts
import App from "@/App";
import React from "react";
import { AuthLayout } from "@/layouts/AuthLayout";
import MainPageLayout from "@/layouts/MainPageLayout";
import { About } from "@/pages/About";
import { NewMessage } from "@/pages/NewMessage";
import LoginPage from "@/pages/Login";
import MessagesList from "@/pages/MessagesList";





import { createBrowserRouter } from "react-router-dom";
import Profile from "@/pages/Profile";
import DepartmentsPage from "@/pages/Departments";
import Dashboard from "@/pages/Dashboard";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: App,
        children: [
            {
                // Rota principal protegida por layout (com sidebar etc)
                path: "",
                // pass props to the layout by using `element` via React.createElement
                element: React.createElement(MainPageLayout, { pageTitle: "Dashboard" }),

                children: [
                    {
                        index: true,
                        Component: Dashboard,
                        handle: { pageTitle: "Home" },
                    },
                    {
                        path: "new-message",
                        Component: NewMessage,
                        handle: { pageTitle: "Nova Mensagem" },
                    },
                    {
                        path: "about",
                        Component: About,
                        handle: { pageTitle: "About" },
                    },
                    {
                        path: "messages",
                        Component: MessagesList,
                        handle: { pageTitle: "Mensagens" },
                    },
                    {
                        path: "profile",
                        Component: Profile,
                        handle: { pageTitle: "Perfil" },
                    },
                    {
                        path: "departments",
                        Component: DepartmentsPage,
                        handle: { pageTitle: "Departamentos" },
                    },

                ],
            },
            {
                path: "auth",
                Component: AuthLayout,
                children: [
                    {
                        path: "login",
                        Component: LoginPage,
                    },
                ],
            },
        ],
    },
]);