import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { DashboardLayout } from "@/components/dashboard-layout"
import { auth } from "@/lib/auth"

export const Route = createFileRoute("/_authenticated")({
    beforeLoad() {
        if (!auth.isAuthenticated()) {
            throw redirect({ to: "/login" })
        }
    },
    component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
    return (
        <DashboardLayout>
            <Outlet />
        </DashboardLayout>
    )
}
