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
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

const vendorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    phone_number: z.string().min(10, "Phone number is too short"),
    email: z.string().email("Invalid email address"),
    password: z.union([
        z.string().min(8, "Password must be at least 8 characters"),
        z.literal("")
    ]).optional(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateVendorSheet({ open, onOpenChange, onSuccess }: Props) {
    const [serverError, setServerError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<VendorFormValues>({
        resolver: standardSchemaResolver(vendorSchema),
        defaultValues: {
            name: "",
            address: "",
            phone_number: "",
            email: "",
            password: "",
        },
    })

    async function onSubmit(data: VendorFormValues) {
        setServerError(null)
        try {
            await api.createVendor(data)
            toast.success("Vendor created successfully")
            reset()
            onSuccess()
            onOpenChange(false)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to create vendor"
            setServerError(msg)
            toast.error(msg)
        }
    }

    // Generate a strong random password
    function generateStrongPassword(): string {
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        const lowercase = "abcdefghijklmnopqrstuvwxyz"
        const numbers = "0123456789"
        const symbols = "!@#$%^&*-_=+"
        const allChars = uppercase + lowercase + numbers + symbols

        let password = ""
        // Ensure at least one character from each category
        password += uppercase[Math.floor(Math.random() * uppercase.length)]
        password += lowercase[Math.floor(Math.random() * lowercase.length)]
        password += numbers[Math.floor(Math.random() * numbers.length)]
        password += symbols[Math.floor(Math.random() * symbols.length)]

        // Fill remaining length with random characters
        for (let i = password.length; i < 12; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)]
        }

        // Shuffle the password
        return password
            .split("")
            .sort(() => Math.random() - 0.5)
            .join("")
    }

    // Handle sheet closing — reset form if closing
    function handleOpenChange(newOpen: boolean) {
        if (!newOpen) {
            reset()
            setServerError(null)
        }
        onOpenChange(newOpen)
    }

    function handleGeneratePassword() {
        const newPassword = generateStrongPassword()
        setValue("password", newPassword)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Create Vendor</SheetTitle>
                    <SheetDescription>
                        Add a new restaurant or vendor to the platform.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8 p-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" placeholder="e.g. Mama Cass" {...register("name")} />
                        {errors.name && (
                            <p className="text-destructive text-sm">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="contact@example.com"
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-destructive text-sm">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number</Label>
                        <Input
                            id="phone_number"
                            type="tel"
                            placeholder="08012345678"
                            {...register("phone_number")}
                        />
                        {errors.phone_number && (
                            <p className="text-destructive text-sm">
                                {errors.phone_number.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Physical Address</Label>
                        <Input
                            id="address"
                            placeholder="123 Main St, Lagos"
                            {...register("address")}
                        />
                        {errors.address && (
                            <p className="text-destructive text-sm">{errors.address.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password (Optional)</Label>
                        <div className="relative">

                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter a secure password"
                                {...register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOffIcon className="size-4" />
                                ) : (
                                    <EyeIcon className="size-4" />
                                )}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="text-xs text-primary hover:underline font-medium"
                        >
                            Generate Strong Password
                        </button>
                        {errors.password && (
                            <p className="text-destructive text-sm">{errors.password.message}</p>
                        )}
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
                            {isSubmitting ? "Creating..." : "Create Vendor"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
