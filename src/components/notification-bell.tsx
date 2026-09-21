import { BellIcon, Trash2Icon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useOrderAlerts } from "@/components/order-alerts-provider"

export function NotificationBell() {
    const { alerts, unreadCount, isConnected, markAllRead, deleteNotification } =
        useOrderAlerts()

    return (
        <Popover onOpenChange={(open) => open && void markAllRead()}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <BellIcon className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium leading-none text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-medium">Order alerts</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                            className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                        />
                        {isConnected ? "Live" : "Offline"}
                    </span>
                </div>

                {alerts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No order alerts yet. New and updated orders will show up here with a sound.
                    </p>
                ) : (
                    <ul className="max-h-80 divide-y overflow-y-auto">
                        {alerts.map((alert) => (
                            <li key={alert.id} className="flex gap-2 px-4 py-3 text-sm">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">
                                            {alert.isNewOrder ? "New order" : "Order updated"}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(alert.receivedAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {alert.orderNumber} · {alert.status.replace(/_/g, " ")}
                                    </p>
                                    {alert.orderId > 0 && (
                                        <Link
                                            to="/marketplace/orders/$orderId"
                                            params={{ orderId: String(alert.orderId) }}
                                            className="text-primary mt-1 inline-block text-xs hover:underline"
                                        >
                                            View order
                                        </Link>
                                    )}
                                </div>
                                {alert.notificationId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                        aria-label="Delete notification"
                                        onClick={() => void deleteNotification(alert.notificationId!)}
                                    >
                                        <Trash2Icon className="size-4" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    )
}
