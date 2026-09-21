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
import { api } from "@/lib/api"
import type { MarketplaceCategory } from "@/types/marketplace"

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
    open: boolean
    onOpenChange: (open: boolean) => void
    vendorId: string | number | undefined
    categories: MarketplaceCategory[]
    onSuccess: () => void
}

export function CreateProductSheet({ open, onOpenChange, vendorId, categories, onSuccess }: Props) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormValues>({
        resolver: standardSchemaResolver(productSchema),
        defaultValues: {
            name: "",
            marketplace_category_id: undefined,
            price: undefined,
            discount_price: "",
            unit: "",
            description: "",
        },
    })

    async function onSubmit(data: ProductFormValues) {
        if (!vendorId) {
            setServerError("No vendor is linked to this account.")
            return
        }
        setServerError(null)
        try {
            await api.createMarketplaceProduct(vendorId, {
                name: data.name,
                marketplace_category_id: data.marketplace_category_id || null,
                price: data.price,
                discount_price: data.discount_price === "" ? null : Number(data.discount_price),
                unit: data.unit || undefined,
                description: data.description || undefined,
                image: imageFile,
            })
            toast.success("Product added to catalog")
            reset()
            setImageFile(null)
            onSuccess()
            onOpenChange(false)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create product"
            setServerError(msg)
            toast.error(msg)
        }
    }

    function handleOpenChange(newOpen: boolean) {
        if (!newOpen) {
            reset()
            setImageFile(null)
            setServerError(null)
        }
        onOpenChange(newOpen)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Add Product</SheetTitle>
                    <SheetDescription>
                        Add a new item to this vendor's marketplace catalog.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input id="name" placeholder="e.g. Jollof Rice" {...register("name")} />
                        {errors.name && (
                            <p className="text-destructive text-sm">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Controller
                            name="marketplace_category_id"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger id="category" className="w-full">
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
                            <Label htmlFor="price">Price (₦)</Label>
                            <Input id="price" type="number" step="0.01" placeholder="2500" {...register("price")} />
                            {errors.price && (
                                <p className="text-destructive text-sm">{errors.price.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount_price">Discount Price (₦)</Label>
                            <Input id="discount_price" type="number" step="0.01" placeholder="Optional" {...register("discount_price")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Input id="unit" placeholder="e.g. plate, kg, pack" {...register("unit")} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="Short description of the product" {...register("description")} />
                    </div>

                    <ProductImagePicker value={imageFile} onChange={setImageFile} />

                    {serverError && (
                        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                            {serverError}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Adding..." : "Add Product"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
