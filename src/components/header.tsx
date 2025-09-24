import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";

type HeaderProps = {
    title: string;
};

const Header: React.FC<HeaderProps> = ({ title }) => {
    return (
        <div className="flex items-center justify-between m-5">
            
            <SidebarTrigger className="hover:bg-none focus:bg-none focus:ring-0" />
            <h3 className="text-3xl font-bold">{title}</h3>
            <ModeToggle />

        </div>
    );
};

export default Header;