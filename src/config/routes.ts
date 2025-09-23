// src/routes.ts
import App from "@/App";
import { AuthLayout } from "@/layouts/AuthLayout";
import MainPageLayout from "@/layouts/MainPageLayout";
import { About } from "@/pages/About";
import { HomePage } from "@/pages/HomePage";
import LoginPage from "@/pages/Login";





import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: App,
        children: [
            {
                // Rota principal protegida por layout (com sidebar etc)
                path: "",
                Component: MainPageLayout,

                children: [
                    {
                        index: true,
                        Component: HomePage,
                    },
                    {
                        path: "about",
                        Component: About,
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