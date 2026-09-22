import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { EyeIcon, RefreshCwIcon, UserRoundPlusIcon, XCircleIcon } from "lucide-react"

import { useMarketplaceOrders } from "@/hooks/useMarketplaceOrders"
import { api, ApiError } from "@/lib/api"
import { emitMarketplaceOrderRefresh } from "@/lib/marketplace-realtime"
import { EDITABLE_MARKETPLACE_ORDER_STATUSES, type MarketplaceOrder } from "@/types/marketplace"
import type { Rider } from "@/types/logistics"
import { MarketplaceRiderPickerSheet } from "@/components/marketplace/marketplace-rider-picker-sheet"

const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    ongoing: { label: "Ongoing", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    paid: { label: "Paid", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    confirmed: { label: "Confirmed", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
    preparing: { label: "Preparing", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    on_the_way: { label: "On the Way", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    completed: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    cancelled: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-500" },
}

function formatCurrency(amount: number | string | null | undefined) {
    const value = typeof amount === "string" ? parseFloat(amount) : amount
    if (value == null || Number.isNaN(value)) return "—"
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value)
}

const COLUMN_COUNT = 9

function canAssignRider(order: MarketplaceOrder) {
    return !order.rider && order.status !== "completed" && order.status !== "cancelled"
}

interface Props {
    tab?: "pending" | "ongoing" | "completed"
}

export function MarketplaceOrdersTable({ tab }: Props) {
    const { orders, isLoading, error, refetch, applyStatus } = useMarketplaceOrders({ tab })
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [riderPickerOpen, setRiderPickerOpen] = useState(false)
    const [availableRiders, setAvailableRiders] = useState<Rider[]>([])
    const [loadingRiders, setLoadingRiders] = useState(false)

    const assignableIds = orders.filter(canAssignRider).map((order) => order.id)
    const allAssignableSelected =
        assignableIds.length > 0 && assignableIds.every((id) => selectedIds.has(id))

    function toggleOrder(orderId: string) {
        setSelectedIds((current) => {
            const next = new Set(current)
            if (next.has(orderId)) next.delete(orderId)
            else next.add(orderId)
            return next
        })
    }

    function toggleAllAssignable() {
        setSelectedIds(allAssignableSelected ? new Set() : new Set(assignableIds))
    }

    async function openBatchRiderPicker() {
        if (selectedIds.size < 2) return
        setRiderPickerOpen(true)
        setLoadingRiders(true)
        try {
            setAvailableRiders(await api.getAvailableRiders())
        } catch (err) {
            setAvailableRiders([])
            toast.error(err instanceof ApiError ? err.message : "Failed to load available riders")
        } finally {
            setLoadingRiders(false)
        }
    }

    function handleBatchAssigned() {
        setRiderPickerOpen(false)
        setSelectedIds(new Set())
        toast.success("Rider assigned to selected marketplace orders")
        void refetch({ silent: true })
    }

    async function handleStatusChange(order: MarketplaceOrder, status: string) {
        setUpdatingId(order.id)
        applyStatus(order.id, status)
        try {
            await api.updateMarketplaceOrderStatus(order.id, status)
            emitMarketplaceOrderRefresh({
                marketplace_order_id: Number(order.id),
                order_number: order.order_number,
                status: status as MarketplaceOrder["status"],
                previous_status: order.status,
                agent_status: order.agent_status ?? null,
                previous_agent_status: order.agent_status ?? null,
                vendor_id: Number(order.vendor?.id ?? 0),
                agent_id: order.agent?.id ?? null,
                rider_id: order.rider?.id ?? null,
                updated_at: new Date().toISOString(),
            })
            toast.success(`Order ${order.order_number} updated`)
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to update order status"
            toast.error(msg)
            void refetch({ silent: true })
        } finally {
            setUpdatingId(null)
        }
    }

    async function handleReject(order: MarketplaceOrder) {
        if (!window.confirm(`Reject order ${order.order_number}? This will cancel the order.`)) {
            return
        }
        await handleStatusChange(order, "cancelled")
    }

    return (
        <>
        <div className="overflow-x-auto rounded-md border">
            {selectedIds.size > 0 && (
                <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm">
                    <span className="flex-1 font-medium">
                        {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected
                        {selectedIds.size < 2 && (
                            <span className="text-muted-foreground ml-2 text-xs font-normal">
                                Select at least 2 for batch assignment
                            </span>
                        )}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={selectedIds.size < 2}
                        onClick={() => void openBatchRiderPicker()}
                    >
                        <UserRoundPlusIcon className="size-4" />
                        Assign Rider
                    </Button>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <input
                                type="checkbox"
                                className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                                checked={allAssignableSelected}
                                disabled={assignableIds.length === 0}
                                onChange={toggleAllAssignable}
                                aria-label="Select all unassigned marketplace orders"
                            />
                        </TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Placed</TableHead>
                        <TableHead className="text-right">Reject</TableHead>
                        <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="size-4" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-destructive">
                                <div className="flex flex-col items-center gap-2">
                                    {error}
                                    <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
                                        <RefreshCwIcon className="size-3.5" />
                                        Retry
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-muted-foreground">
                                No marketplace orders found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => {
                            const status = statusConfig[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground" }
                            const isFinal = order.status === "completed" || order.status === "cancelled"
                            return (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        {canAssignRider(order) && (
                                            <input
                                                type="checkbox"
                                                className="size-4 cursor-pointer accent-primary"
                                                checked={selectedIds.has(order.id)}
                                                onChange={() => toggleOrder(order.id)}
                                                aria-label={`Select order ${order.order_number}`}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{order.order_number}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) === 1 ? "" : "s"}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatCurrency(order.total ?? order.pricing?.total)}</TableCell>
                                    <TableCell>
                                        {isFinal ? (
                                            <Badge className={status.className} variant="outline">
                                                {status.label}
                                            </Badge>
                                        ) : (
                                            <Select
                                                disabled={updatingId === order.id}
                                                value={order.status}
                                                onValueChange={(value) => handleStatusChange(order, value)}
                                            >
                                                <SelectTrigger className="w-40" size="sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={order.status}>
                                                        {status.label}
                                                    </SelectItem>
                                                    {EDITABLE_MARKETPLACE_ORDER_STATUSES
                                                        .filter((s) => s !== order.status)
                                                        .map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {statusConfig[s]?.label ?? s}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {order.agent?.full_name ?? order.agent?.name ?? (order.agent_status
                                            ? order.agent_status.replace(/_/g, " ")
                                            : "—")}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                                        {format(new Date(order.created_at), "MMM d, HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!isFinal && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="ml-auto text-destructive hover:text-destructive"
                                                disabled={updatingId === order.id}
                                                aria-label={`Reject order ${order.order_number}`}
                                                onClick={() => void handleReject(order)}
                                            >
                                                <XCircleIcon className="size-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="ml-auto"
                                            asChild
                                        >
                                            <Link
                                                to="/marketplace/orders/$orderId"
                                                params={{ orderId: order.id }}
                                                aria-label={`View order ${order.order_number}`}
                                            >
                                                <EyeIcon className="size-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
        {riderPickerOpen && (
            <MarketplaceRiderPickerSheet
                orderIds={[...selectedIds]}
                orderNumber={`${selectedIds.size} marketplace orders`}
                riders={availableRiders}
                loadingRiders={loadingRiders}
                open={riderPickerOpen}
                onOpenChange={setRiderPickerOpen}
                onDone={handleBatchAssigned}
            />
        )}
        </>
    )
}
