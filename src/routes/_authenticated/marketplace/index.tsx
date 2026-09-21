import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { PlusIcon, ShoppingBagIcon, UsersIcon } from "lucide-react"

import { usePageTitle } from "@/hooks/usePageTitle"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { MarketplaceOrdersTable } from "@/components/marketplace/marketplace-orders-table"
import { MarketplaceProductsTable } from "@/components/marketplace/marketplace-products-table"
import { MarketplaceCategoriesPanel } from "@/components/marketplace/marketplace-categories-panel"
import { CreateProductSheet } from "@/components/marketplace/create-product-sheet"
import { MarketplaceAgentsTable } from "@/components/marketplace/marketplace-agents-table"
import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories"
import { useMarketplaceOrderCounts } from "@/hooks/useMarketplaceOrderCounts"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authenticated/marketplace/")({
    component: MarketplacePage,
})

function MarketplacePage() {
    usePageTitle("Marketplace")

    const currentUser = useMemo(() => auth.getCurrentUser(), [])
    const vendorId = currentUser?.vendor_id

    const [ordersTab, setOrdersTab] = useState<"pending" | "ongoing" | "completed" | undefined>(undefined)
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
    const [productSheetOpen, setProductSheetOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    const { categories, refetch: refetchCategories } = useMarketplaceCategories(vendorId)
    const { counts, isLoading: countsLoading } = useMarketplaceOrderCounts()

    const bumpRefresh = () => setRefreshKey((k) => k + 1)

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage marketplace orders, your product catalog, and categories.
                    </p>
                </div>
            </div>

            {!vendorId && (
                <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md p-3 text-sm">
                    No vendor is linked to this account, so the catalog can't be loaded. Marketplace
                    orders are unaffected.
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {countsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="mb-2 h-8 w-12" />
                                <Skeleton className="h-4 w-24" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold tabular-nums">{counts.newOrders}</p>
                                <p className="text-muted-foreground text-sm">New / pending</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold tabular-nums">{counts.confirmed}</p>
                                <p className="text-muted-foreground text-sm">Confirmed</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold tabular-nums">{counts.preparing}</p>
                                <p className="text-muted-foreground text-sm">Preparing</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-2xl font-semibold tabular-nums">{counts.completed}</p>
                                <p className="text-muted-foreground text-sm">Completed</p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Tabs defaultValue="orders" className="w-full">
                <TabsList>
                    <TabsTrigger value="orders" className="gap-2">
                        <ShoppingBagIcon className="size-4" />
                        Orders
                    </TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="agents" className="gap-2">
                        <UsersIcon className="size-4" />
                        Agents
                    </TabsTrigger>
                </TabsList>

                {/* Orders */}
                <TabsContent value="orders" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-lg font-medium">Marketplace Orders</CardTitle>
                            <Select
                                value={ordersTab ?? "all"}
                                onValueChange={(v) => setOrdersTab(v === "all" ? undefined : (v as "pending" | "ongoing" | "completed"))}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="ongoing">Ongoing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            <MarketplaceOrdersTable key={ordersTab} tab={ordersTab} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Products */}
                <TabsContent value="products" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle className="text-lg font-medium">Product Catalog</CardTitle>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={categoryFilter ?? "all"}
                                    onValueChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}
                                >
                                    <SelectTrigger className="w-44">
                                        <SelectValue placeholder="All categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    className="gap-2"
                                    disabled={!vendorId}
                                    onClick={() => setProductSheetOpen(true)}
                                >
                                    <PlusIcon className="size-4" />
                                    Add Product
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <MarketplaceProductsTable
                                key={refreshKey}
                                vendorId={vendorId}
                                categoryId={categoryFilter}
                                categories={categories}
                                onChanged={bumpRefresh}
                            />
                        </CardContent>
                    </Card>

                    <CreateProductSheet
                        open={productSheetOpen}
                        onOpenChange={setProductSheetOpen}
                        vendorId={vendorId}
                        categories={categories}
                        onSuccess={bumpRefresh}
                    />
                </TabsContent>

                {/* Categories */}
                <TabsContent value="categories" className="mt-4">
                    <MarketplaceCategoriesPanel
                        vendorId={vendorId}
                        onChanged={() => {
                            refetchCategories()
                            bumpRefresh()
                        }}
                    />
                </TabsContent>

                {/* Agents */}
                <TabsContent value="agents" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-medium">Field Agents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MarketplaceAgentsTable />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
