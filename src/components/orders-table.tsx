import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, EllipsisVerticalIcon, EyeIcon, UserRoundPlusIcon, RefreshCwIcon, AlertCircleIcon, LayersIcon } from "lucide-react"

import type { ColumnDef } from "@tanstack/react-table"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import type { DateFilterValue } from "@/components/orders/OrderDateFilter"
import { usePagination } from "@/hooks/use-pagination"
import { useOrders } from "@/hooks/useOrders"
import { api, ApiError } from "@/lib/api"
import { getDeliveryPoints, getOrderReference, isBatchOrder } from "@/lib/order-batches"
import type { Order } from "@/types/logistics"
import { DeliveryStatus, PaymentStatus } from "@/types/logistics"

// ── Status badge colour map ───────────────────────────────────────────────────

const deliveryStatusConfig: Record<
    string,
    { label: string; className: string }
> = {
    [DeliveryStatus.PENDING]: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    [DeliveryStatus.ACCEPTED]: { label: "Accepted", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    [DeliveryStatus.ARRIVED_PICKUP]: { label: "Arrived Pickup", className: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
    [DeliveryStatus.PICKED_UP]: { label: "Picked Up", className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
    [DeliveryStatus.START_DELIVERY]: { label: "Start Delivery", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    [DeliveryStatus.IN_TRANSIT]: { label: "In Transit", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    [DeliveryStatus.DELIVERED]: { label: "Delivered", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    [DeliveryStatus.CANCELLED]: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-500" },
    [DeliveryStatus.FAILED]: { label: "Failed", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
}

const paymentStatusConfig: Record<
    string,
    { label: string; dotClass: string }
> = {
    [PaymentStatus.PENDING]: { label: "Pending", dotClass: "bg-yellow-500" },
    [PaymentStatus.PAID]: { label: "Paid", dotClass: "bg-green-500" },
    [PaymentStatus.FAILED]: { label: "Failed", dotClass: "bg-red-500" },
    [PaymentStatus.REFUNDED]: { label: "Refunded", dotClass: "bg-zinc-400" },
}

// ── Pending-order helpers ─────────────────────────────────────────────────────

/** Statuses that mean an order is no longer in flight. */
const COMPLETED_STATUSES: string[] = [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.CANCELLED,
    DeliveryStatus.FAILED,
]

/** A pending order is unassigned (no rider) and not yet completed/cancelled/failed. */
function isPendingOrder(order: Order): boolean {
    return !order.rider && !COMPLETED_STATUSES.includes(order.status)
}

// ── Selection checkbox ─────────────────────────────────────────────────────────

function SelectCheckbox({
    checked,
    indeterminate = false,
    disabled = false,
    onChange,
    label,
}: {
    checked: boolean
    indeterminate?: boolean
    disabled?: boolean
    onChange: () => void
    label: string
}) {
    const ref = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate && !checked
    }, [indeterminate, checked])

    return (
        <input
            ref={ref}
            type="checkbox"
            className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            aria-label={label}
        />
    )
}

// ── Helper function to format date ──────────────────────────────────────────

function formatOrderDate(dateString: string): string {
    try {
        const date = new Date(dateString)
        return format(date, "MMM d, yyyy h:mm a")
    } catch {
        return dateString
    }
}

// ── Data column definitions ────────────────────────────────────────────────────

const dataColumns: ColumnDef<Order>[] = [
    {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => (
            <span className="text-muted-foreground font-mono text-xs">
                #{getOrderReference(row.original)}
            </span>
        ),
    },
    {
        id: "customer",
        header: "Delivery Points",
        cell: ({ row }) => {
            const points = getDeliveryPoints(row.original)
            const isBatch = isBatchOrder(row.original)

            return (
                <div className="flex max-w-56 flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="line-clamp-1 font-medium">
                            {isBatch
                                ? `${points.length} delivery point${points.length === 1 ? "" : "s"}`
                                : points[0]?.customer.name}
                        </span>
                        {isBatch && (
                            <Badge className="rounded-sm bg-primary/10 px-1.5 text-primary shrink-0">
                                Batch
                            </Badge>
                        )}
                    </div>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                        {isBatch
                            ? points.map((point) => point.customer.name).join(", ")
                            : points[0]?.customer.phone}
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "item_description",
        header: "Item",
        cell: ({ row }) => (
            <span className="line-clamp-1 max-w-[160px] text-sm">
                {row.original.item_description}
            </span>
        ),
    },
    {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
            <span className="font-medium">
                {new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    maximumFractionDigits: 0,
                }).format(row.original.amount)}
            </span>
        ),
    },
    {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => {
            const cfg = paymentStatusConfig[row.original.payment_status] ?? {
                label: row.original.payment_status,
                dotClass: "bg-zinc-400",
            }
            return (
                <div className="flex items-center gap-1.5 text-sm">
                    <span className={`size-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                    {cfg.label}
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Delivery Status",
        cell: ({ row }) => {
            const cfg = deliveryStatusConfig[row.original.status] ?? {
                label: row.original.status,
                className: "bg-zinc-500/10 text-zinc-500",
            }
            return (
                <Badge className={`rounded-sm px-1.5 capitalize ${cfg.className}`}>
                    {cfg.label}
                </Badge>
            )
        },
    },
    {
        // NEW DATE COLUMN
        accessorKey: "created_at",
        header: "Created Date",
        cell: ({ row }) => {
            const date = row.original.created_at
            return (
                <div className="flex flex-col text-sm">
                    <span className="font-medium">
                        {formatOrderDate(date)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {format(new Date(date), "yyyy-MM-dd")}
                    </span>
                </div>
            )
        },
    },
    {
        id: "actions",
        header: () => "Actions",
        size: 60,
        enableHiding: false,
        cell: ({ row }) => <RowActions order={row.original} />,
    },
]

// ── Row actions ────────────────────────────────────────────────────────────────

function RowActions({ order }: { order: Order }) {
    const navigate = useNavigate()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full p-2"
                    aria-label="Order actions"
                >
                    <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        onClick={() => navigate({ to: "/orders/$orderId", params: { orderId: order.id } })}
                    >
                        <EyeIcon className="size-4" />
                        <span>View details</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => console.log("Assign rider", order.id)}
                        disabled={!!order.rider}
                    >
                        <UserRoundPlusIcon className="size-4" />
                        <span>{order.rider ? "Rider assigned" : "Assign rider"}</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count = 5, columnCount }: { count?: number; columnCount: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: columnCount }).map((_, j) => (
                        <TableCell key={j} className="first:pl-4">
                            <Skeleton className="h-4 w-full max-w-[120px] rounded" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

interface OrdersTableProps {
    dateFilter?: DateFilterValue | null
}

export function OrdersTable({ dateFilter }: OrdersTableProps) {
    const navigate = useNavigate()
    const { orders, total, page, isLoading, error, setPage, setDateFilter, refetch } =
        useOrders({ page: 1, limit: PAGE_SIZE })

    useEffect(() => {
        setDateFilter(dateFilter ?? null)
    }, [dateFilter, setDateFilter])

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isCreating, setIsCreating] = useState(false)

    // Selection only applies to the visible page — reset it when the page changes.
    useEffect(() => {
        setSelectedIds(new Set())
    }, [page])

    // Pending orders (unassigned + uncompleted) are surfaced first.
    const sortedOrders = useMemo(
        () => [...orders].sort((a, b) => Number(isPendingOrder(b)) - Number(isPendingOrder(a))),
        [orders]
    )

    const pendingIds = useMemo(
        () => sortedOrders.filter(isPendingOrder).map((o) => o.id),
        [sortedOrders]
    )
    const allPendingSelected =
        pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id))
    const somePendingSelected = pendingIds.some((id) => selectedIds.has(id))

    function toggleRow(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function toggleAllPending() {
        setSelectedIds((prev) => {
            if (allPendingSelected) {
                const next = new Set(prev)
                pendingIds.forEach((id) => next.delete(id))
                return next
            }
            return new Set([...prev, ...pendingIds])
        })
    }

    const columns = useMemo<ColumnDef<Order>[]>(
        () => [
            {
                id: "select",
                size: 40,
                enableHiding: false,
                header: () => (
                    <SelectCheckbox
                        checked={allPendingSelected}
                        indeterminate={somePendingSelected}
                        disabled={pendingIds.length === 0}
                        onChange={toggleAllPending}
                        label="Select all pending orders"
                    />
                ),
                cell: ({ row }) =>
                    isPendingOrder(row.original) ? (
                        <SelectCheckbox
                            checked={selectedIds.has(row.original.id)}
                            onChange={() => toggleRow(row.original.id)}
                            label={`Select order ${getOrderReference(row.original)}`}
                        />
                    ) : null,
            },
            ...dataColumns,
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [allPendingSelected, somePendingSelected, pendingIds, selectedIds]
    )

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const table = useReactTable({
        data: sortedOrders,
        columns,
        getCoreRowModel: getCoreRowModel(),
        // Pagination is managed server-side — no client-side pagination model
        manualPagination: true,
        pageCount: totalPages,
    })

    const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
        currentPage: page,
        totalPages,
        paginationItemsToDisplay: 3,
    })

    const fromRow = (page - 1) * PAGE_SIZE + 1
    const toRow = Math.min(page * PAGE_SIZE, total)

    async function handleCreateBatch() {
        if (selectedIds.size < 2 || isCreating) return
        setIsCreating(true)
        try {
            const result = await api.batchOrders([...selectedIds])
            toast.success("Batch order created", {
                description: `${selectedIds.size} orders combined into one batch.`,
            })
            setSelectedIds(new Set())
            if (result.orderId) {
                navigate({ to: "/orders/$orderId", params: { orderId: result.orderId } })
            } else {
                toast.warning("Batch created, but no order ID was returned.")
                refetch()
            }
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                        ? err.message
                        : "Something went wrong."
            toast.error("Could not create batch order", { description: message })
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="w-full">
            {/* Error banner */}
            {error && (
                <div className="bg-destructive/10 text-destructive mx-4 my-3 flex items-center gap-3 rounded-lg border border-destructive/30 px-4 py-2 text-sm">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refetch}
                        className="text-destructive hover:text-destructive gap-1.5"
                    >
                        <RefreshCwIcon className="size-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Batch selection bar */}
            {selectedIds.size > 0 && (
                <div className="border-primary/30 bg-primary/5 mx-4 my-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm">
                    <span className="flex-1 font-medium">
                        {selectedIds.size} pending order{selectedIds.size === 1 ? "" : "s"} selected
                        {selectedIds.size < 2 && (
                            <span className="text-muted-foreground ml-2 text-xs font-normal">
                                Select at least 2 to create a batch
                            </span>
                        )}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                        disabled={isCreating}
                    >
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleCreateBatch}
                        disabled={selectedIds.size < 2 || isCreating}
                        className="gap-1.5"
                    >
                        <LayersIcon className="size-4" />
                        {isCreating ? "Creating…" : "Create Batch Order"}
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="border-b">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="text-muted-foreground h-14 first:pl-4"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <SkeletonRows count={PAGE_SIZE} columnCount={columns.length} />
                        ) : table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="first:pl-4">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col">
                <p className="text-muted-foreground text-sm whitespace-nowrap" aria-live="polite">
                    {isLoading ? (
                        <Skeleton className="h-4 w-40 rounded" />
                    ) : total > 0 ? (
                        <>
                            Showing <span className="text-foreground font-medium">{fromRow}–{toRow}</span>{" "}
                            of <span className="text-foreground font-medium">{total}</span> orders
                        </>
                    ) : null}
                </p>

                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <Button
                                className="disabled:pointer-events-none disabled:opacity-50"
                                variant="ghost"
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1 || isLoading}
                                aria-label="Go to previous page"
                            >
                                <ChevronLeftIcon aria-hidden="true" />
                                Previous
                            </Button>
                        </PaginationItem>

                        {showLeftEllipsis && (
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                        )}

                        {pages.map((p) => {
                            const isActive = p === page
                            return (
                                <PaginationItem key={p}>
                                    <Button
                                        size="icon"
                                        className={
                                            isActive
                                                ? ""
                                                : "bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary/20"
                                        }
                                        onClick={() => setPage(p)}
                                        aria-current={isActive ? "page" : undefined}
                                        disabled={isLoading}
                                    >
                                        {p}
                                    </Button>
                                </PaginationItem>
                            )
                        })}

                        {showRightEllipsis && (
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                        )}

                        <PaginationItem>
                            <Button
                                className="disabled:pointer-events-none disabled:opacity-50"
                                variant="ghost"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= totalPages || isLoading}
                                aria-label="Go to next page"
                            >
                                Next
                                <ChevronRightIcon aria-hidden="true" />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    )
}