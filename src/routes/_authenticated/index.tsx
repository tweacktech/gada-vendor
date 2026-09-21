import { createFileRoute } from "@tanstack/react-router"
import {
    ShoppingCartIcon,
    TrendingUpIcon,
    AlertCircleIcon,
    RefreshCwIcon,
    FilterIcon,
} from "lucide-react"
import { useState } from "react"
import type { SVGProps } from "react"

import StatisticsCard from "@/components/shadcn-studio/blocks/statistics-card-01"
import { OrdersTable } from "@/components/orders-table"
import { OrderDateFilter } from "@/components/orders/OrderDateFilter"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"
import { usePageTitle } from "@/hooks/usePageTitle"
import { getFilterLabel, type DateFilterValue } from "@/lib/dateFilter"

export const Route = createFileRoute("/_authenticated/")({
    component: DashboardPage,
})

function formatPct(value: number): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
}

const NairaIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M6 19V5l12 14V5" />
        <path d="M4 10h16" />
        <path d="M4 14h16" />
    </svg>
)

function DashboardPage() {
    usePageTitle("Dashboard")

    // Single source of truth: both the stats cards and the deliveries table
    // read from this. Changing it re-fetches both automatically.
    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const { metrics, isLoading, error, refetch } = useDashboardMetrics({ dateFilter })

    const handleClearFilter = () => setDateFilter(null)

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1)
        refetch()
    }

    return (
        <>
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        Welcome back. Here's what's happening today.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh dashboard">
                        <RefreshCwIcon className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Error alert */}
            {error && (
                <div className="bg-destructive/10 text-destructive flex items-center gap-3 rounded-lg border border-destructive/30 px-4 py-3 text-sm">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        className="text-destructive hover:text-destructive gap-1.5"
                    >
                        <RefreshCwIcon className="size-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Stats row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="gap-4">
                            <CardHeader className="flex items-center">
                                <Skeleton className="size-8 rounded-md" />
                                <Skeleton className="h-8 w-24 rounded-md" />
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Skeleton className="h-4 w-32 rounded" />
                                <Skeleton className="h-3 w-20 rounded" />
                            </CardContent>
                        </Card>
                    ))
                ) : metrics ? (
                    <>
                        <StatisticsCard
                            icon={<NairaIcon className="size-4" />}
                            value={metrics.total_revenue.toLocaleString("en-NG", {
                                style: "currency",
                                currency: "NGN",
                                maximumFractionDigits: 0,
                            })}
                            title="Total Revenue"
                            changePercentage={formatPct(metrics.revenue_change_pct)}
                        />
                        <StatisticsCard
                            icon={<ShoppingCartIcon className="size-4" />}
                            value={metrics.total_orders.toLocaleString()}
                            title="Total Orders"
                            changePercentage={formatPct(metrics.orders_change_pct)}
                        />
                        <StatisticsCard
                            icon={<TrendingUpIcon className="size-4" />}
                            value={`${metrics.conversion_rate.toFixed(1)}%`}
                            title="Conversion Rate"
                            changePercentage={formatPct(metrics.conversion_change_pct)}
                        />
                    </>
                ) : null}
            </div>

            {/* Recent Deliveries table */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">Recent Deliveries</span>
                        {dateFilter && (
                            <Badge variant="secondary" className="gap-2 px-3 py-1">
                                <FilterIcon className="size-3" />
                                {getFilterLabel(dateFilter)}
                                <button
                                    onClick={handleClearFilter}
                                    className="ml-1 hover:text-destructive"
                                    aria-label="Clear filter"
                                >
                                    ×
                                </button>
                            </Badge>
                        )}
                    </div>
                    <OrderDateFilter value={dateFilter} onChange={setDateFilter} />
                </CardHeader>
                <CardContent className="p-0">
                    <OrdersTable key={refreshKey} dateFilter={dateFilter} />
                </CardContent>
            </Card>
        </>
    )
}