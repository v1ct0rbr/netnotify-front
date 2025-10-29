import { cn } from "@/lib/utils";
import { Outlet } from "react-router";

export function AuthLayout() {
 

    return (
        <main
              data-slot="sidebar-inset"
              className={cn(
                "bg-background relative flex w-full flex-1 flex-col",
                "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
                "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:rounded-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:shadow-none",
                "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:border md:peer-data-[variant=inset]:peer-data-[state=collapsed]:border-border",
              )}>
           <Outlet />
        </main>
    );
}