import { Link, useRouterState } from "@tanstack/react-router"
import {
    LayoutDashboardIcon,
    Settings2Icon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    StoreIcon,
    Sun,
    Moon,
} from "lucide-react"
import { useMemo } from "react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar"
// import LanguageDropdown from "@/components/shadcn-studio/blocks/dropdown-language"
import ProfileDropdown from "@/components/shadcn-studio/blocks/dropdown-profile"
import { NotificationBell } from "@/components/notification-bell"
import { OrderAlertsProvider } from "@/components/order-alerts-provider"
import { auth } from "@/lib/auth"

interface NavItem {
    icon: React.ElementType
    label: string
    to: string
}

const mainNavItems: NavItem[] = [
    { icon: LayoutDashboardIcon, label: "Dashboard", to: "/" },
    { icon: ShoppingCartIcon, label: "Orders", to: "/orders" },
    // { icon: UsersIcon, label: "Customers", to: "/customers" },
    { icon: ShoppingBagIcon, label: "Marketplace", to: "/marketplace" },
    { icon: StoreIcon, label: "Vendors", to: "/vendors" },
    // { icon: ReceiptIcon, label: "Transactions", to: "/transactions" },
]

const secondaryNavItems: NavItem[] = [
    { icon: Settings2Icon, label: "Settings", to: "/settings" },
]

function NavLink({ item }: { item: NavItem }) {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const isActive =
        item.to === "/"
            ? pathname === "/"
            : pathname.startsWith(item.to)

    return (
        <SidebarMenuItem>
            <SidebarMenuButton isActive={isActive} tooltip={item.label} asChild>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={item.to as any}>
                    <item.icon />
                    <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    )
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { resolvedTheme, setTheme } = useTheme()
    const currentUser = useMemo(() => auth.getCurrentUser(), [])
    const userInitials = useMemo(
        () => (currentUser ? getInitials(currentUser.full_name) : ""),
        [currentUser]
    )
    const userName = currentUser?.full_name ?? "User"
    const userEmail = currentUser?.email ?? ""

    const toggleTheme = () => {
        setTheme(resolvedTheme === "light" ? "dark" : "light")
    }

    return (
        <OrderAlertsProvider>
        <SidebarProvider>
            <Sidebar collapsible="icon">
                {/* Logo */}
                <SidebarHeader className="p-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <img
                            src="/gadaride-logo.png"
                            className="shrink-0 rounded-md w-28"
                            alt="logo"
                        />
                    </div>
                </SidebarHeader>

                {/* Main nav */}
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Main</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {mainNavItems.map((item) => (
                                    <NavLink key={item.label} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup className="mt-auto">
                        <SidebarGroupLabel>System</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {secondaryNavItems.map((item) => (
                                    <NavLink key={item.label} item={item} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                {/* User footer */}
                <SidebarSeparator />
                <SidebarFooter>
                    <ProfileDropdown
                        align="start"
                        trigger={
                            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent">
                                <Avatar className="size-8 shrink-0">
                                    <AvatarImage
                                        src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png"
                                        alt={userName}
                                    />
                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                </Avatar>
                                <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                                    <span className="text-sidebar-foreground truncate text-sm font-medium">
                                        {userName}
                                    </span>
                                    <span className="text-sidebar-foreground/60 truncate text-xs">
                                        {userEmail}
                                    </span>
                                </div>
                            </button>
                        }
                    />
                </SidebarFooter>

                <SidebarRail />
            </Sidebar>

            {/* Main content area */}
            <SidebarInset>
                {/* Top header bar */}
                <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger />
                        <span className="text-muted-foreground hidden text-sm sm:inline">
                            Dashboard
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <NotificationBell />

                        {/* Dark/Light mode toggle - simplified single button */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            {resolvedTheme === "light" ? (
                                <Moon className="size-5" />
                            ) : (
                                <Sun className="size-5" />
                            )}
                        </Button>

                        {/* Language switcher */}
                        {/* <LanguageDropdown
                            trigger={
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <GlobeIcon className="size-5" />
                                    <span className="sr-only">Language</span>
                                </Button>
                            }
                        /> */}

                        {/* Profile */}
                        <ProfileDropdown
                            trigger={
                                <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    <Avatar className="size-8">
                                        <AvatarImage
                                            src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png"
                                            alt={userName}
                                        />
                                        <AvatarFallback>{userInitials}</AvatarFallback>
                                    </Avatar>
                                </button>
                            }
                        />
                    </div>
                </header>

                {/* Page content */}
                <div className="flex flex-1 flex-col gap-6 p-6">{children}</div>
            </SidebarInset>
        </SidebarProvider>
        </OrderAlertsProvider>
    )
}