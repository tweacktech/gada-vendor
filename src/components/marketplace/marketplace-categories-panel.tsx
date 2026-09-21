import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon, TagIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

import { useMarketplaceCategories } from "@/hooks/useMarketplaceCategories"
import { CreateCategorySheet } from "@/components/marketplace/create-category-sheet"
import { api, ApiError } from "@/lib/api"

interface Props {
    vendorId: string | number | undefined
    onChanged: () => void
}

export function MarketplaceCategoriesPanel({ vendorId, onChanged }: Props) {
    const { categories, isLoading, error, refetch } = useMarketplaceCategories(vendorId)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)

    async function handleDelete(categoryId: string, name: string) {
        if (!window.confirm(`Delete category "${name}"? Products keep their data but lose this grouping.`)) return
        setBusyId(categoryId)
        try {
            await api.deleteMarketplaceCategory(categoryId)
            toast.success("Category deleted")
            refetch()
            onChanged()
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to delete category"
            toast.error(msg)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <TagIcon className="size-5 text-muted-foreground" />
                    Categories
                </CardTitle>
                <Button size="sm" className="gap-2" onClick={() => setSheetOpen(true)}>
                    <PlusIcon className="size-4" />
                    New Category
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-24 rounded-full" />
                        ))}
                    </div>
                ) : error ? (
                    <p className="text-destructive text-sm">{error}</p>
                ) : categories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No categories yet. Create one to organize the product catalog.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <Badge
                                key={category.id}
                                variant="outline"
                                className="gap-2 px-3 py-1.5 text-sm"
                            >
                                {category.icon ? <span>{category.icon}</span> : null}
                                {category.name}
                                <button
                                    onClick={() => handleDelete(category.id, category.name)}
                                    disabled={busyId === category.id}
                                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                                    aria-label={`Delete ${category.name}`}
                                >
                                    <Trash2Icon className="size-3.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            <CreateCategorySheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                vendorId={vendorId}
                onSuccess={() => {
                    refetch()
                    onChanged()
                }}
            />
        </Card>
    )
}
