import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    CheckCircle2Icon,
    ChefHatIcon,
    CircleIcon,
    CreditCardIcon,
    MapPinIcon,
    MoreHorizontalIcon,
    PackageIcon,
    PhoneIcon,
    RefreshCwIcon,
    StoreIcon,
    TruckIcon,
    UserRoundIcon,
    UserRoundPlusIcon,
    XCircleIcon,
} from "lucide-react"

import { useMarketplaceOrder } from "@/hooks/useMarketplaceOrder"
import { usePageTitle } from "@/hooks/usePageTitle"
import { api, ApiError } from "@/lib/api"
import type { MarketplaceOrderTimelineResponse } from "@/types/marketplace"
import { MarketplaceRiderPickerSheet } from "@/components/marketplace/marketplace-rider-picker-sheet"
import { extractGeoPoint } from "@/lib/vendor-location"
import { MarketplaceAgentPickerSheet } from "@/components/marketplace/marketplace-agent-picker-sheet"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/marketplace/orders/$orderId")({
    component: MarketplaceOrderDetailPage,
})

// ── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
    pending: { label: "Pending", badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    ongoing: { label: "Ongoing", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    paid: { label: "Paid", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    confirmed: { label: "Confirmed", badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
    preparing: { label: "Preparing", badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    on_the_way: { label: "On the Way", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    completed: { label: "Completed", badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400" },
    cancelled: { label: "Cancelled", badgeClass: "bg-zinc-500/10 text-zinc-500" },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | string | null | undefined) {
    const value = typeof amount === "string" ? parseFloat(amount) : amount
    if (value == null || Number.isNaN(value)) return "—"
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value)
}

function formatDate(value: string | null | undefined) {
    if (!value) return null
    try {
        return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    } catch {
        return value
    }
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
                <Icon className="text-muted-foreground size-3.5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="text-sm font-medium">{value}</span>
            </div>
        </div>
    )
}

function SectionSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-7 shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Order timeline (GET /marketplace/orders/{order}/timeline) ─────────────

function OrderTimeline({
    timeline,
    cancelledAt,
}: {
    timeline: MarketplaceOrderTimelineResponse | null
    cancelledAt?: string | null
}) {
    const steps = timeline?.steps
    if (!steps?.length) {
        return <p className="text-muted-foreground text-sm">No timeline data available.</p>
    }

    return (
        <div className="flex flex-col gap-0">
            {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1
                return (
                    <div key={step.status} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                            <div
                                className={[
                                    "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                                    step.completed
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-muted-foreground",
                                ].join(" ")}
                            >
                                {step.completed ? (
                                    <CheckCircle2Icon className="size-3.5" />
                                ) : (
                                    <CircleIcon className="size-3.5" />
                                )}
                            </div>
                            {!isLast && (
                                <div className={["min-h-8 w-0.5 flex-1", step.completed ? "bg-primary" : "bg-border"].join(" ")} />
                            )}
                        </div>
                        <div className="pt-1 pb-6">
                            <p className={step.completed ? "text-foreground text-sm font-medium" : "text-muted-foreground text-sm font-medium"}>
                                {step.label}
                            </p>
                            {step.reached_at && (
                                <p className="text-muted-foreground text-xs">{formatDate(step.reached_at)}</p>
                            )}
                        </div>
                    </div>
                )
            })}

            {timeline?.current_status === "cancelled" && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    Order cancelled
                    {cancelledAt && ` · ${formatDate(cancelledAt)}`}
                </div>
            )}
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function MarketplaceOrderDetailPage() {
    const { orderId } = Route.useParams()
    const { order, timeline, isLoading, error, refetch } = useMarketplaceOrder(orderId)
    usePageTitle(order ? `Order ${order.order_number}` : "Marketplace Order")

    const [riderPickerOpen, setRiderPickerOpen] = useState(false)
    const [agentPickerOpen, setAgentPickerOpen] = useState(false)
    const [statusBusy, setStatusBusy] = useState(false)
    const [riderReferenceLat, setRiderReferenceLat] = useState<number | null>(null)
    const [riderReferenceLng, setRiderReferenceLng] = useState<number | null>(null)

    function openRiderPicker() {
        const vendorPoint = order?.vendor
            ? extractGeoPoint(order.vendor as unknown as Record<string, unknown>)
            : null
        const deliveryPoint =
            order?.delivery?.latitude && order?.delivery?.longitude
                ? {
                      latitude: parseFloat(order.delivery.latitude),
                      longitude: parseFloat(order.delivery.longitude),
                  }
                : null
        const point = vendorPoint ?? deliveryPoint
        setRiderReferenceLat(point?.latitude ?? null)
        setRiderReferenceLng(point?.longitude ?? null)
        setRiderPickerOpen(true)
    }

    function handleRiderAssigned() {
        setRiderPickerOpen(false)
        refetch()
    }

    function handleAgentAssigned() {
        setAgentPickerOpen(false)
        refetch()
    }

    async function handleStatusChange(status: string) {
        if (!order) return
        const label = statusConfig[status]?.label ?? status
        const message =
            status === "cancelled"
                ? `Cancel order ${order.order_number}?`
                : `Change order ${order.order_number} to ${label}?`
        if (!window.confirm(message)) return
        setStatusBusy(true)
        try {
            await api.updateMarketplaceOrderStatus(order.id, status)
            toast.success(`Order moved to ${statusConfig[status]?.label ?? status}`)
            refetch()
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to update status")
        } finally {
            setStatusBusy(false)
        }
    }

    function handleCancel() {
        if (!order) return
        void handleStatusChange("cancelled")
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-6 w-48 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                    </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}><SectionSkeleton /></Card>
                        ))}
                    </div>
                    <div className="flex flex-col gap-6">
                        <Card><SectionSkeleton /></Card>
                        <Card><SectionSkeleton /></Card>
                    </div>
                </div>
            </>
        )
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <AlertCircleIcon className="text-muted-foreground size-10" />
                <div>
                    <p className="font-medium">Could not load order</p>
                    <p className="text-muted-foreground mt-1 text-sm">{error ?? "Order not found."}</p>
                </div>
                <Button variant="outline" onClick={refetch} className="gap-2">
                    <RefreshCwIcon className="size-4" />
                    Retry
                </Button>
            </div>
        )
    }

    const status = statusConfig[order.status] ?? { label: order.status, badgeClass: "bg-zinc-500/10 text-zinc-500" }
    const canUpdate = order.status.toLowerCase() === "confirmed"
    return (
        <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="-ml-1">
                        <Link to="/marketplace">
                            <ArrowLeftIcon className="size-4" />
                            <span className="sr-only">Back to marketplace</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Order Details</h1>
                        <p className="text-muted-foreground font-mono text-sm">{order.order_number}</p>
                        {(timeline?.pin ?? order.pin) && (
                            <p className="text-muted-foreground text-xs">
                                Delivery PIN <span className="text-foreground font-mono font-medium">{timeline?.pin ?? order.pin}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`rounded-sm capitalize ${status.badgeClass}`}>{status.label}</Badge>
                    <span className="text-muted-foreground text-xs">{formatDate(order.created_at)}</span>
                    {canUpdate && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={statusBusy} className="gap-1.5">
                                    <MoreHorizontalIcon className="size-4" />
                                    Actions
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    disabled={statusBusy}
                                    onClick={() => void handleStatusChange("preparing")}
                                >
                                    <ChefHatIcon />
                                    Mark as preparing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    disabled={statusBusy}
                                    onClick={handleCancel}
                                >
                                    <XCircleIcon />
                                    Cancel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left column */}
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <UserRoundIcon className="text-muted-foreground size-4" />
                                Customer, Agent & Rider
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-3">
                                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Customer</p>
                                <InfoRow icon={UserRoundIcon} label="Name" value={order.customer?.full_name ?? "—"} />
                                <InfoRow icon={PhoneIcon} label="Phone" value={order.customer?.phone ?? "—"} />
                                <InfoRow icon={StoreIcon} label="Vendor" value={order.vendor?.name ?? "—"} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Agent</p>
                                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setAgentPickerOpen(true)}>
                                        <UserRoundPlusIcon className="size-3.5" />
                                        {order.agent ? "Reassign" : "Assign"}
                                    </Button>
                                </div>
                                <InfoRow
                                    icon={UserRoundIcon}
                                    label="Name"
                                    value={order.agent?.full_name ?? order.agent?.name ?? "Not assigned"}
                                />
                                <InfoRow icon={PhoneIcon} label="Phone" value={order.agent?.phone ?? "—"} />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Rider</p>
                                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={openRiderPicker}>
                                        <UserRoundPlusIcon className="size-3.5" />
                                        {order.rider ? "Reassign" : "Assign"}
                                    </Button>
                                </div>
                                <InfoRow icon={TruckIcon} label="Name" value={order.rider?.name ?? "Not assigned"} />
                                <InfoRow icon={PhoneIcon} label="Phone" value={order.rider?.phone ?? "—"} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Delivery */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <MapPinIcon className="text-muted-foreground size-4" />
                                Delivery
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <InfoRow
                                icon={MapPinIcon}
                                label="Delivery Address"
                                value={order.delivery?.address ?? order.delivery_address ?? "—"}
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <InfoRow icon={TruckIcon} label="Assigned Rider" value={order.rider?.name ?? "No rider assigned yet"} />
                                <Button size="sm" variant="outline" onClick={openRiderPicker} className="gap-1.5">
                                    <UserRoundPlusIcon className="size-3.5" />
                                    {order.rider ? "Reassign rider" : "Assign rider"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <PackageIcon className="text-muted-foreground size-4" />
                                Items ({order.items?.length ?? 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {order.items?.length ? (
                                order.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                                                <PackageIcon className="text-muted-foreground size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">{item.product_name}</p>
                                                <p className="text-muted-foreground text-xs">
                                                    Qty {item.quantity} · {formatCurrency(item.unit_price)} each
                                                </p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-sm font-medium">{formatCurrency(item.total_price)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-sm">No items on this order.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pricing & Collection */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <CreditCardIcon className="text-muted-foreground size-4" />
                                Pricing & Collection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(order.pricing?.subtotal ?? order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Delivery Fee</span>
                                <span>{formatCurrency(order.pricing?.delivery_fee ?? order.delivery_fee)}</span>
                            </div>
                            {(order.pricing?.market_run_fee ?? order.market_run_fee) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Market Run Fee</span>
                                    <span>{formatCurrency(order.pricing?.market_run_fee ?? order.market_run_fee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                                <span>Total</span>
                                <span>{formatCurrency(order.pricing?.total ?? order.total)}</span>
                            </div>
                            {order.collection?.amount != null && (
                                <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                                    <span className="text-muted-foreground">Cash Collection</span>
                                    <span className="flex items-center gap-2">
                                        {formatCurrency(order.collection.amount)}
                                        <Badge
                                            variant="outline"
                                            className={order.collection.paid ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"}
                                        >
                                            {order.collection.paid ? "Paid" : "Unpaid"}
                                        </Badge>
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {order.notes && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{order.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <TruckIcon className="text-muted-foreground size-4" />
                                Order Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OrderTimeline timeline={timeline} cancelledAt={order.cancelled_at} />
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Rider picker */}
            <MarketplaceRiderPickerSheet
                orderId={order.id}
                orderNumber={order.order_number}
                referenceLat={riderReferenceLat}
                referenceLng={riderReferenceLng}
                open={riderPickerOpen}
                onOpenChange={setRiderPickerOpen}
                onDone={handleRiderAssigned}
            />

            {/* Agent picker */}
            <MarketplaceAgentPickerSheet
                orderId={order.id}
                orderNumber={order.order_number}
                open={agentPickerOpen}
                onOpenChange={setAgentPickerOpen}
                onDone={handleAgentAssigned}
            />
        </>
    )
}
