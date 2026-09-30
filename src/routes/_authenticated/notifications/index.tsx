import { createFileRoute, Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { BellIcon, CheckCheckIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useOrderAlerts } from "@/components/order-alerts-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePageTitle } from "@/hooks/usePageTitle"
import { ApiError } from "@/lib/api"

export const Route = createFileRoute("/_authenticated/notifications/")({
    component: NotificationsPage,
})

function NotificationsPage() {
    usePageTitle("Notifications")
    const {
        alerts,
        unreadCount,
        isLoading,
        markAllRead,
        markAsRead,
        deleteNotification,
    } = useOrderAlerts()

    const handleDelete = async (notificationId: string) => {
        try {
            await deleteNotification(notificationId)
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not delete notification")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground text-sm">
                        {unreadCount > 0
                            ? `${unreadCount} unread`
                            : "You're all caught up."}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => void markAllRead()}
                    >
                        <CheckCheckIcon className="size-4" />
                        Mark all read
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-3 p-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                            <BellIcon className="text-muted-foreground size-8" />
                            <p className="text-sm font-medium">No notifications yet</p>
                            <p className="text-muted-foreground text-sm">
                                New orders and updates will show up here.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {alerts.map((alert) => {
                                const unread = !alert.readAt
                                return (
                                    <li
                                        key={alert.id}
                                        className={`flex gap-3 px-4 py-4 sm:px-6 ${unread ? "bg-primary/5" : ""}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <button
                                                type="button"
                                                className="w-full text-left"
                                                onClick={() => {
                                                    if (unread) void markAsRead(alert.notificationId)
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className={unread ? "font-semibold" : "font-medium"}>
                                                        {alert.isNewOrder ? "New order" : "Order updated"}
                                                    </span>
                                                    <span className="text-muted-foreground shrink-0 text-xs">
                                                        {formatDistanceToNow(new Date(alert.receivedAt), {
                                                            addSuffix: true,
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                    {alert.orderNumber} · {alert.status.replace(/_/g, " ")}
                                                </p>
                                            </button>
                                            {alert.orderId > 0 && (
                                                <Link
                                                    to="/marketplace/orders/$orderId"
                                                    params={{ orderId: String(alert.orderId) }}
                                                    className="text-primary mt-2 inline-block text-sm hover:underline"
                                                    onClick={() => {
                                                        if (unread) void markAsRead(alert.notificationId)
                                                    }}
                                                >
                                                    View order
                                                </Link>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                                            aria-label="Delete notification"
                                            onClick={() => void handleDelete(alert.notificationId)}
                                        >
                                            <Trash2Icon className="size-4" />
                                        </Button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
