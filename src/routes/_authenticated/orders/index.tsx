// routes/_authenticated/orders/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusIcon, RefreshCwIcon, FilterIcon } from "lucide-react"
import { useState } from "react"

import { OrderDateFilter } from "@/components/orders/OrderDateFilter"
import { OrdersTable } from "@/components/orders-table"
import { usePageTitle } from "@/hooks/usePageTitle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getFilterLabel, type DateFilterValue } from "@/lib/dateFilter"

export const Route = createFileRoute("/_authenticated/orders/")({
    component: OrdersPage,
})

function OrdersPage() {
    usePageTitle("Orders")
    const [dateFilter, setDateFilter] = useState<DateFilterValue | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const handleRefresh = () => setRefreshKey((prev) => prev + 1)
    const handleClearFilter = () => setDateFilter(null)

    return (
        <>
            {/* Page heading */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Orders</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage delivery batches and single-drop orders.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {dateFilter && (
                        <Badge variant="secondary" className="gap-2 px-3 py-1">
                            <FilterIcon className="size-3" />
                            {getFilterLabel(dateFilter)}
                            <button onClick={handleClearFilter} className="ml-1 hover:text-destructive">
                                ×
                            </button>
                        </Badge>
                    )}
                    <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh orders">
                        <RefreshCwIcon className="size-4" />
                    </Button>
                    <Button asChild>
                        <Link to="/orders/create">
                            <PlusIcon className="size-4" />
                            New Order
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Orders table */}
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">Orders</span>
                        <Badge variant="outline" className="ml-2">
                            {dateFilter ? "Filtered" : "All"}
                        </Badge>
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