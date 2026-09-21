import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { api } from "@/lib/api"

const categorySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    icon: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendorId: string | number | undefined
    onSuccess: () => void
}

export function CreateCategorySheet({ open, onOpenChange, vendorId, onSuccess }: Props) {
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormValues>({
        resolver: standardSchemaResolver(categorySchema),
        defaultValues: { name: "", icon: "" },
    })

    async function onSubmit(data: CategoryFormValues) {
        if (!vendorId) {
            setServerError("No vendor is linked to this account.")
            return
        }
        setServerError(null)
        try {
            await api.createMarketplaceCategory(vendorId, {
                name: data.name,
                icon: data.icon || undefined,
            })
            toast.success("Category created")
            reset()
            onSuccess()
            onOpenChange(false)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create category"
            setServerError(msg)
            toast.error(msg)
        }
    }

    function handleOpenChange(newOpen: boolean) {
        if (!newOpen) {
            reset()
            setServerError(null)
        }
        onOpenChange(newOpen)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-sm">
                <SheetHeader>
                    <SheetTitle>Create Category</SheetTitle>
                    <SheetDescription>
                        Group products together, e.g. Drinks, Appetizers, Fruits.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Category Name</Label>
                        <Input id="cat-name" placeholder="e.g. Drinks" {...register("name")} />
                        {errors.name && (
                            <p className="text-destructive text-sm">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-icon">Icon (optional)</Label>
                        <Input id="cat-icon" placeholder="e.g. 🥤 or an icon name" {...register("icon")} />
                    </div>

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
                            {isSubmitting ? "Creating..." : "Create Category"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
