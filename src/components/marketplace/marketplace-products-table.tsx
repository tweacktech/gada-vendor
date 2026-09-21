import { useState } from "react"
import { toast } from "sonner"
import { PackageIcon, PencilIcon, RefreshCwIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { useMarketplaceProducts } from "@/hooks/useMarketplaceProducts"
import { api, ApiError } from "@/lib/api"
import type { MarketplaceCategory, MarketplaceProduct } from "@/types/marketplace"
import { EditProductSheet } from "@/components/marketplace/edit-product-sheet"

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount)
}

interface Props {
    vendorId: string | number | undefined
    categoryId?: string
    categories: MarketplaceCategory[]
    onChanged: () => void
}

export function MarketplaceProductsTable({ vendorId, categoryId, categories, onChanged }: Props) {
    const { products, isLoading, error, refetch } = useMarketplaceProducts(vendorId, categoryId)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null)

    const categoryName = (id: string | null) =>
        categories.find((c) => c.id === id)?.name ?? "Uncategorized"

    async function handleToggleAvailability(productId: string) {
        setBusyId(productId)
        try {
            await api.toggleMarketplaceProductAvailability(productId)
            refetch()
            onChanged()
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to update product"
            toast.error(msg)
        } finally {
            setBusyId(null)
        }
    }

    async function handleDelete(productId: string, name: string) {
        if (!window.confirm(`Remove "${name}" from the catalog?`)) return
        setBusyId(productId)
        try {
            await api.deleteMarketplaceProduct(productId)
            toast.success("Product removed")
            refetch()
            onChanged()
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to delete product"
            toast.error(msg)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[280px]">Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                <div className="flex flex-col items-center gap-2">
                                    {error}
                                    <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
                                        <RefreshCwIcon className="size-3.5" />
                                        Retry
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No products yet. Click "Add Product" to build the catalog.
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="size-full object-cover" />
                                            ) : (
                                                <PackageIcon className="text-muted-foreground size-4" />
                                            )}
                                        </div>
                                        <span>{product.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {categoryName(product.category_id)}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {product.discount_price ? (
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground line-through">
                                                {formatCurrency(product.price)}
                                            </span>
                                            <span className="font-medium">{formatCurrency(product.discount_price)}</span>
                                        </div>
                                    ) : (
                                        formatCurrency(product.price)
                                    )}
                                </TableCell>
                                <TableCell>
                                    <button
                                        onClick={() => handleToggleAvailability(product.id)}
                                        disabled={busyId === product.id}
                                        className="disabled:opacity-50"
                                    >
                                        <Badge
                                            variant="outline"
                                            className={
                                                product.is_available
                                                    ? "bg-green-500/10 text-green-600 dark:text-green-400 cursor-pointer"
                                                    : "bg-zinc-500/10 text-zinc-500 cursor-pointer"
                                            }
                                        >
                                            {product.is_available ? "Available" : "Unavailable"}
                                        </Badge>
                                    </button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5"
                                        disabled={busyId === product.id}
                                        onClick={() => setEditingProduct(product)}
                                    >
                                        <PencilIcon className="size-3.5" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        disabled={busyId === product.id}
                                        onClick={() => handleDelete(product.id, product.name)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <EditProductSheet
                product={editingProduct}
                onOpenChange={(open) => {
                    if (!open) setEditingProduct(null)
                }}
                categories={categories}
                onSuccess={() => {
                    refetch()
                    onChanged()
                }}
            />
        </div>
    )
}
