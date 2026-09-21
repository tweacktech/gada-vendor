import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ProductImagePicker } from "@/components/marketplace/product-image-picker"
import { api, ApiError } from "@/lib/api"
import type { MarketplaceCategory, MarketplaceProduct } from "@/types/marketplace"

const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    marketplace_category_id: z.string().optional(),
    price: z.coerce.number().positive("Price must be greater than 0"),
    discount_price: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface Props {
    /** The product being edited, or null when the sheet should be closed. */
    product: MarketplaceProduct | null
    onOpenChange: (open: boolean) => void
    categories: MarketplaceCategory[]
    onSuccess: () => void
}

function toFormValues(product: MarketplaceProduct): ProductFormValues {
    return {
        name: product.name,
        marketplace_category_id: product.category_id ?? undefined,
        price: product.price,
        discount_price: product.discount_price ?? "",
        unit: product.unit ?? "",
        description: product.description ?? "",
    }
}

/**
 * Owns the Sheet chrome and remembers the last product it showed, so the
 * form stays populated while the sheet slides shut instead of blanking the
 * instant `product` flips to null.
 */
export function EditProductSheet({ product, onOpenChange, categories, onSuccess }: Props) {
    const [lastProduct, setLastProduct] = useState(product)
    if (product && product !== lastProduct) {
        setLastProduct(product)
    }

    return (
        <Sheet open={product !== null} onOpenChange={onOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Edit Product</SheetTitle>
                    <SheetDescription>
                        Update this item in the marketplace catalog.
                    </SheetDescription>
                </SheetHeader>

                {lastProduct && (
                    // Keyed on the product id so switching to a different
                    // product remounts the form with fresh defaultValues,
                    // instead of needing an effect to reset it by hand.
                    <ProductEditForm
                        key={lastProduct.id}
                        product={lastProduct}
                        categories={categories}
                        onCancel={() => onOpenChange(false)}
                        onSuccess={() => {
                            onSuccess()
                            onOpenChange(false)
                        }}
                    />
                )}
            </SheetContent>
        </Sheet>
    )
}

function ProductEditForm({
    product,
    categories,
    onCancel,
    onSuccess,
}: {
    product: MarketplaceProduct
    categories: MarketplaceCategory[]
    onCancel: () => void
    onSuccess: () => void
}) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormValues>({
        resolver: standardSchemaResolver(productSchema),
        defaultValues: toFormValues(product),
    })

    async function onSubmit(data: ProductFormValues) {
        setServerError(null)
        try {
            await api.updateMarketplaceProduct(product.id, {
                name: data.name,
                marketplace_category_id: data.marketplace_category_id || null,
                price: data.price,
                discount_price: data.discount_price === "" ? null : Number(data.discount_price),
                unit: data.unit || undefined,
                description: data.description || undefined,
                image: imageFile,
            })
            toast.success("Product updated")
            onSuccess()
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Failed to update product"
            setServerError(msg)
            toast.error(msg)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 p-6">
            <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input id="edit-name" placeholder="e.g. Jollof Rice" {...register("name")} />
                {errors.name && (
                    <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Controller
                    name="marketplace_category_id"
                    control={control}
                    render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="edit-category" className="w-full">
                                <SelectValue placeholder="Uncategorized" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-price">Price (₦)</Label>
                    <Input id="edit-price" type="number" step="0.01" placeholder="2500" {...register("price")} />
                    {errors.price && (
                        <p className="text-destructive text-sm">{errors.price.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-discount_price">Discount Price (₦)</Label>
                    <Input id="edit-discount_price" type="number" step="0.01" placeholder="Optional" {...register("discount_price")} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input id="edit-unit" placeholder="e.g. plate, kg, pack" {...register("unit")} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" placeholder="Short description of the product" {...register("description")} />
            </div>

            <ProductImagePicker
                id="edit-image"
                value={imageFile}
                onChange={setImageFile}
                existingImageUrl={product.image}
            />

            {serverError && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                    {serverError}
                </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </form>
    )
}
