import { Outlet, createRootRoute } from "@tanstack/react-router"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export const Route = createRootRoute({
    component: () => (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="gadaride-theme">
            <TooltipProvider>
                <Outlet />
                <Toaster richColors position="top-right" />
            </TooltipProvider>
        </ThemeProvider>
    ),
})
