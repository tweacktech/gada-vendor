import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
    ArrowLeftIcon,
    CheckIcon,
    CircleDotIcon,
    ClockIcon,
    MapPinIcon,
    PhoneIcon,
    RefreshCwIcon,
    AlertCircleIcon,
    UserRoundIcon,
    UserRoundPlusIcon,
    StoreIcon,
    PackageIcon,
    CreditCardIcon,
    TruckIcon,
} from "lucide-react"

import { useOrder } from "@/hooks/useOrder"
import { usePageTitle } from "@/hooks/usePageTitle"
import { api, ApiError } from "@/lib/api"
import { getDeliveryPoints, getOrderReference, getPickupLocation, isBatchOrder } from "@/lib/order-batches"
import { buildNearbyRidersParams } from "@/lib/vendor-location"
import { DeliveryStatus, PaymentStatus } from "@/types/logistics"
import type { Order, Rider } from "@/types/logistics"
import { RiderPickerSheet } from "@/components/rider-picker-sheet"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
    component: OrderDetailPage,
})

// ── Status configs ────────────────────────────────────────────────────────────

const deliveryStatusConfig: Record<
    string,
    { label: string; badgeClass: string; icon: React.ElementType; step: number }
> = {
    [DeliveryStatus.PENDING]: { label: "Pending", badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", icon: ClockIcon, step: 0 },
    [DeliveryStatus.ACCEPTED]: { label: "Accepted", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: CheckIcon, step: 1 },
    [DeliveryStatus.ARRIVED_PICKUP]: { label: "Arrived Pickup", badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400", icon: MapPinIcon, step: 2 },
    [DeliveryStatus.PICKED_UP]: { label: "Picked Up", badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", icon: PackageIcon, step: 3 },
    [DeliveryStatus.START_DELIVERY]: { label: "Start Delivery", badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: TruckIcon, step: 4 },
    [DeliveryStatus.IN_TRANSIT]: { label: "In Transit", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: TruckIcon, step: 5 },
    [DeliveryStatus.DELIVERED]: { label: "Delivered", badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400", icon: CheckIcon, step: 6 },
    [DeliveryStatus.CANCELLED]: { label: "Cancelled", badgeClass: "bg-zinc-500/10 text-zinc-500", icon: CircleDotIcon, step: -1 },
    [DeliveryStatus.FAILED]: { label: "Failed", badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400", icon: AlertCircleIcon, step: -1 },
}

const paymentStatusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
    [PaymentStatus.PENDING]: { label: "Pending", dotClass: "bg-yellow-500", badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    [PaymentStatus.PAID]: { label: "Paid", dotClass: "bg-green-500", badgeClass: "bg-green-500/10 text-green-600 dark:text-green-400" },
    [PaymentStatus.FAILED]: { label: "Failed", dotClass: "bg-red-500", badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400" },
    [PaymentStatus.REFUNDED]: { label: "Refunded", dotClass: "bg-zinc-400", badgeClass: "bg-zinc-500/10 text-zinc-500" },
}

// Timeline steps (main happy-path steps only; cancelled/failed handled separately)
const timelineSteps = [
    { key: DeliveryStatus.PENDING, label: "Order Placed", icon: ClockIcon },
    { key: DeliveryStatus.ACCEPTED, label: "Rider Accepted", icon: CheckIcon },
    { key: DeliveryStatus.ARRIVED_PICKUP, label: "Arrived Pickup", icon: MapPinIcon },
    { key: DeliveryStatus.PICKED_UP, label: "Picked Up", icon: PackageIcon },
    { key: DeliveryStatus.START_DELIVERY, label: "Start Delivery", icon: TruckIcon },
    { key: DeliveryStatus.IN_TRANSIT, label: "In Transit", icon: TruckIcon },
    { key: DeliveryStatus.DELIVERED, label: "Delivered", icon: CheckIcon },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
    }).format(amount)
}


function formatDate(iso: string) {
    return new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(iso))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-3.5 text-muted-foreground" />
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
                    <Skeleton className="size-7 rounded-md shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Delivery Status Timeline ──────────────────────────────────────────────────

function StatusTimeline({ status }: { status: string }) {
    const currentStep = deliveryStatusConfig[status]?.step ?? 0
    const isTerminal = status === DeliveryStatus.CANCELLED || status === DeliveryStatus.FAILED

    return (
        <div className="flex flex-col gap-0">
            {timelineSteps.map((step, idx) => {
                const stepCfg = deliveryStatusConfig[step.key]
                const done = currentStep > stepCfg.step
                const active = currentStep === stepCfg.step && !isTerminal
                const isLast = idx === timelineSteps.length - 1

                return (
                    <div key={step.key} className="flex items-start gap-4">
                        {/* Dot + line */}
                        <div className="flex flex-col items-center">
                            <div
                                className={[
                                    "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                                    done ? "border-primary bg-primary text-primary-foreground"
                                        : active ? "border-primary bg-background text-primary"
                                            : "border-border bg-background text-muted-foreground",
                                ].join(" ")}
                            >
                                <step.icon className="size-3.5" />
                            </div>
                            {!isLast && (
                                <div
                                    className={[
                                        "w-0.5 flex-1 min-h-8",
                                        done ? "bg-primary" : "bg-border",
                                    ].join(" ")}
                                />
                            )}
                        </div>

                        {/* Label */}
                        <div className={["pb-6 pt-1 text-sm font-medium", !isLast ? "" : ""].join(" ")}>
                            <span
                                className={
                                    done ? "text-foreground"
                                        : active ? "text-primary"
                                            : "text-muted-foreground"
                                }
                            >
                                {step.label}
                            </span>
                        </div>
                    </div>
                )
            })}

            {/* Terminal state override */}
            {isTerminal && (
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    Order {status === DeliveryStatus.CANCELLED ? "cancelled" : "failed"}
                </div>
            )}
        </div>
    )
}

function DeliveryPointCard({
    point,
    index,
}: {
    point: ReturnType<typeof getDeliveryPoints>[number]
    index: number
}) {
    const cfg = deliveryStatusConfig[point.status] ?? {
        label: point.status,
        badgeClass: "bg-zinc-500/10 text-zinc-500",
        icon: CircleDotIcon,
        step: 0,
    }

    return (
        <div className="rounded-lg border bg-muted/20 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold">
                        Delivery point {point.index ?? index + 1}
                    </h3>
                    {point.id && (
                        <p className="text-muted-foreground font-mono text-xs">
                            #{point.id.slice(0, 8).toUpperCase()}
                        </p>
                    )}
                </div>
                <Badge className={`rounded-sm capitalize ${cfg.badgeClass}`}>
                    {cfg.label}
                </Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                <div className="flex flex-col gap-4">
                    <InfoRow icon={UserRoundIcon} label="Customer" value={point.customer.name} />
                    <InfoRow icon={PhoneIcon} label="Phone" value={point.customer.phone} />
                    {point.customerEmail && (
                        <InfoRow icon={UserRoundIcon} label="Email" value={point.customerEmail} />
                    )}
                    <InfoRow icon={MapPinIcon} label="Delivery Address" value={point.deliveryLocation.address} />
                    {point.productCategory && (
                        <InfoRow icon={PackageIcon} label="Product Category" value={point.productCategory} />
                    )}
                    {point.itemDescription && (
                        <InfoRow icon={PackageIcon} label="Items" value={point.itemDescription} />
                    )}
                    {point.tripPrice !== undefined && (
                        <InfoRow icon={CreditCardIcon} label="Delivery Price" value={formatCurrency(point.tripPrice)} />
                    )}
                    {point.deliveredAt && (
                        <InfoRow icon={CheckIcon} label="Delivered At" value={formatDate(point.deliveredAt)} />
                    )}
                </div>
                <div>
                    <p className="mb-3 text-xs font-medium text-muted-foreground">
                        Progress
                    </p>
                    <StatusTimeline status={point.status} />
                </div>
            </div>
        </div>
    )
}

// ── Rider Card ────────────────────────────────────────────────────────────────

function RiderCard({
    order,
    onReassign,
}: {
    order: Order
    onReassign: () => void
}) {
    const rider = order.rider

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TruckIcon className="size-4 text-muted-foreground" />
                    Assigned Rider
                </CardTitle>
                <Button size="sm" variant="outline" onClick={onReassign} className="gap-1.5 h-7 text-xs">
                    <UserRoundPlusIcon className="size-3.5" />
                    {rider ? "Reassign" : "Assign Rider"}
                </Button>
            </CardHeader>
            <CardContent>
                {rider ? (
                    <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                            {rider.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="font-medium text-sm">{rider.name ?? "Unknown"}</span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                                <span className="flex items-center gap-1">
                                    <PhoneIcon className="size-3" />
                                    {rider.phone}
                                </span>
                                <Badge className="rounded-sm bg-green-500/10 text-green-600 dark:text-green-400 capitalize text-xs">
                                    {rider.availability_status}
                                </Badge>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                            <UserRoundIcon className="size-5" />
                        </div>
                        <span className="text-sm">No rider assigned yet.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function OrderDetailPage() {
    const { orderId } = Route.useParams()
    const { order, isLoading, error, refetch } = useOrder(orderId)
    usePageTitle(order ? `Order ${getOrderReference(order)}` : "Order Details")

    // Rider-picker sheet state
    const [pickerOpen, setPickerOpen] = useState(false)
    const [availableRiders, setAvailableRiders] = useState<Rider[]>([])
    const [ridersLoading, setRidersLoading] = useState(false)
    const [riderError, setRiderError] = useState<string | null>(null)

    async function openRiderPicker() {
        setPickerOpen(true)
        setRidersLoading(true)
        setRiderError(null)
        try {
            const pickup = order ? getPickupLocation(order) : null
            const fallback =
                pickup &&
                Number.isFinite(pickup.latitude) &&
                Number.isFinite(pickup.longitude) &&
                (pickup.latitude !== 0 || pickup.longitude !== 0)
                    ? { latitude: pickup.latitude, longitude: pickup.longitude }
                    : null
            const params = await buildNearbyRidersParams(fallback)
            const riders = await api.getAvailableRiders(params)
            setAvailableRiders(riders)
        } catch (err) {
            setRiderError(
                err instanceof ApiError ? err.message : "Could not load riders."
            )
        } finally {
            setRidersLoading(false)
        }
    }

    function handleRiderAssigned() {
        setPickerOpen(false)
        refetch() // reload order to reflect new rider
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────
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

    // ── Error state ───────────────────────────────────────────────────────────
    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <AlertCircleIcon className="size-10 text-muted-foreground" />
                <div>
                    <p className="font-medium">Could not load order</p>
                    <p className="text-muted-foreground text-sm mt-1">{error ?? "Order not found."}</p>
                </div>
                <Button variant="outline" onClick={refetch} className="gap-2">
                    <RefreshCwIcon className="size-4" />
                    Retry
                </Button>
            </div>
        )
    }

    const deliveryCfg = deliveryStatusConfig[order.status] ?? {
        label: order.status,
        badgeClass: "bg-zinc-500/10 text-zinc-500",
        icon: CircleDotIcon,
        step: 0,
    }
    const paymentCfg = paymentStatusConfig[order.payment_status] ?? {
        label: order.payment_status,
        dotClass: "bg-zinc-400",
        badgeClass: "bg-zinc-500/10 text-zinc-500",
    }
    const deliveryPoints = getDeliveryPoints(order)
    const isBatch = isBatchOrder(order)
    const pickupLocation = getPickupLocation(order)

    return (
        <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="-ml-1">
                        <Link to="/orders">
                            <ArrowLeftIcon className="size-4" />
                            <span className="sr-only">Back to orders</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {isBatch ? "Order Batch Details" : "Order Details"}
                        </h1>
                        <p className="text-muted-foreground text-sm font-mono">
                            #{getOrderReference(order)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {isBatch && (
                        <Badge className="rounded-sm bg-primary/10 text-primary">
                            Batch: {deliveryPoints.length} point{deliveryPoints.length === 1 ? "" : "s"}
                        </Badge>
                    )}
                    <Badge className={`rounded-sm capitalize ${paymentCfg.badgeClass}`}>
                        <span className={`mr-1.5 size-1.5 rounded-full ${paymentCfg.dotClass} inline-block`} />
                        {paymentCfg.label}
                    </Badge>
                    <Badge className={`rounded-sm capitalize ${deliveryCfg.badgeClass}`}>
                        {deliveryCfg.label}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                        {formatDate(order.created_at)}
                    </span>
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* Left column — main details */}
                <div className="flex flex-col gap-6 lg:col-span-2">

                    {/* Pickup */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <StoreIcon className="size-4 text-muted-foreground" />
                                Pickup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <InfoRow
                                icon={StoreIcon}
                                label="Pickup Address"
                                value={pickupLocation.address}
                            />
                            <InfoRow
                                icon={TruckIcon}
                                label="Assigned Rider"
                                value={order.rider?.name ?? "No rider assigned yet"}
                            />
                        </CardContent>
                    </Card>

                    {/* Delivery Points */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <MapPinIcon className="size-4 text-muted-foreground" />
                                Delivery Points
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {deliveryPoints.map((point, index) => (
                                <DeliveryPointCard
                                    key={point.id ?? `${point.deliveryLocation.address}-${index}`}
                                    point={point}
                                    index={index}
                                />
                            ))}
                        </CardContent>
                    </Card>

                    {/* Order / Payment */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <CreditCardIcon className="size-4 text-muted-foreground" />
                                Order & Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <InfoRow
                                icon={PackageIcon}
                                label="Item Description"
                                value={order.item_description}
                            />
                            <InfoRow
                                icon={CreditCardIcon}
                                label="Amount"
                                value={
                                    <span className="text-base font-semibold">
                                        {formatCurrency(order.amount)}
                                    </span>
                                }
                            />
                            <InfoRow
                                icon={CreditCardIcon}
                                label="Payment Status"
                                value={
                                    <Badge className={`rounded-sm capitalize text-xs ${paymentCfg.badgeClass}`}>
                                        <span className={`mr-1.5 size-1.5 rounded-full ${paymentCfg.dotClass} inline-block`} />
                                        {paymentCfg.label}
                                    </Badge>
                                }
                            />
                            {order.delivered_at && (
                                <InfoRow
                                    icon={CheckIcon}
                                    label="Delivered At"
                                    value={formatDate(order.delivered_at)}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column — timeline + rider */}
                <div className="flex flex-col gap-6">

                    {/* Delivery Status Timeline */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TruckIcon className="size-4 text-muted-foreground" />
                                {isBatch ? "Batch Progress" : "Delivery Status"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StatusTimeline status={order.status} />
                        </CardContent>
                    </Card>

                    {/* Rider */}
                    <RiderCard order={order} onReassign={openRiderPicker} />

                    {riderError && (
                        <p className="text-destructive text-xs px-1">{riderError}</p>
                    )}
                </div>
            </div>

            {/* Rider assignment sheet (reused from create flow) */}
            {pickerOpen && (
                <RiderPickerSheet
                    order={order}
                    riders={availableRiders}
                    loadingRiders={ridersLoading}
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    onDone={handleRiderAssigned}
                />
            )}
        </>
    )
}
