import { useRef, useState } from "react"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { Controller, useForm } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { CheckCircle2Icon, EyeIcon, EyeOffIcon, MapPinIcon } from "lucide-react"

import { auth } from "@/lib/auth"
import { api, VENDOR_REGISTRATION_TYPES, type VendorRegistrationType } from "@/lib/api"
import { usePageTitle } from "@/hooks/usePageTitle"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/register")({
    beforeLoad() {
        if (auth.isAuthenticated()) {
            throw redirect({ to: "/" })
        }
    },
    component: RegisterPage,
})

const vendorTypeLabels: Record<VendorRegistrationType, string> = {
    restaurant: "Restaurant",
    pharmacy: "Pharmacy",
    local_market: "Local market",
}

const schema = z
    .object({
        full_name: z.string().trim().min(2, "Enter your full name"),
        email: z.string().trim().email("Enter a valid email address"),
        phone: z.string().trim().min(10, "Enter a valid phone number"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        password_confirmation: z.string().min(1, "Confirm your password"),
        business_name: z.string().trim().min(2, "Enter the business name"),
        type: z.string(),
        address: z.string().trim().min(5, "Enter the business address"),
        latitude: z.string().trim(),
        longitude: z.string().trim(),
    })
    .refine((values) => values.password === values.password_confirmation, {
        message: "Passwords do not match",
        path: ["password_confirmation"],
    })
    .superRefine((values, ctx) => {
        if (!VENDOR_REGISTRATION_TYPES.includes(values.type as VendorRegistrationType)) {
            ctx.addIssue({
                code: "custom",
                message: "Select a business type",
                path: ["type"],
            })
        }

        const latitude = values.latitude.trim()
        const longitude = values.longitude.trim()
        const latitudeNumber = Number(latitude)
        const longitudeNumber = Number(longitude)

        if ((latitude && !longitude) || (!latitude && longitude)) {
            ctx.addIssue({
                code: "custom",
                message: "Enter both latitude and longitude, or leave both blank.",
                path: [latitude ? "longitude" : "latitude"],
            })
        }

        if (latitude && !Number.isFinite(latitudeNumber)) {
            ctx.addIssue({
                code: "custom",
                message: "Enter a valid latitude",
                path: ["latitude"],
            })
        }

        if (longitude && !Number.isFinite(longitudeNumber)) {
            ctx.addIssue({
                code: "custom",
                message: "Enter a valid longitude",
                path: ["longitude"],
            })
        }
    })

type FormValues = z.infer<typeof schema>

function RegisterPage() {
    usePageTitle("Register")

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [mapOpen, setMapOpen] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Last address chosen from a suggestion or the map. Used so the autocomplete's
    // own onChange (which fires with the selected text) doesn't wipe the coordinates.
    const selectedAddressRef = useRef<string | null>(null)
    // Bumped to remount the (uncontrolled) autocomplete after a map pick so it shows the new address.
    const [addressKey, setAddressKey] = useState(0)

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: standardSchemaResolver(schema),
        defaultValues: {
            full_name: "",
            email: "",
            phone: "",
            password: "",
            password_confirmation: "",
            business_name: "",
            type: "",
            address: "",
            latitude: "",
            longitude: "",
        },
    })

    const address = watch("address")
    const latitude = watch("latitude")
    const longitude = watch("longitude")

    function applyLocation(nextAddress: string, lat: number, lng: number) {
        selectedAddressRef.current = nextAddress
        setValue("address", nextAddress, { shouldValidate: true, shouldDirty: true })
        setValue("latitude", String(lat), { shouldValidate: true, shouldDirty: true })
        setValue("longitude", String(lng), { shouldValidate: true, shouldDirty: true })
    }

    function handleAddressTyped(value: string) {
        setValue("address", value, { shouldValidate: true, shouldDirty: true })

        // Only clear coordinates when the user edits away from the selected address.
        if (value !== selectedAddressRef.current) {
            selectedAddressRef.current = null
            setValue("latitude", "", { shouldValidate: true })
            setValue("longitude", "", { shouldValidate: true })
        }
    }

    function handleMapConfirm(nextAddress: string, lat: number, lng: number) {
        applyLocation(nextAddress, lat, lng)
        setAddressKey((key) => key + 1)
    }

    async function onSubmit(values: FormValues) {
        setServerError(null)

        const latitude = values.latitude.trim()
        const longitude = values.longitude.trim()

        try {
            const message = await api.registerVendor({
                full_name: values.full_name.trim(),
                email: values.email.trim(),
                phone: values.phone.trim(),
                password: values.password,
                password_confirmation: values.password_confirmation,
                business_name: values.business_name.trim(),
                type: values.type as VendorRegistrationType,
                address: values.address.trim(),
                ...(latitude && longitude
                    ? { latitude: Number(latitude), longitude: Number(longitude) }
                    : {}),
            })
            setSuccessMessage(message)
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Could not create the account. Please try again."
            setServerError(message)
        }
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4 py-10">
            <div className="w-full max-w-md space-y-10">
                <div className="flex flex-col items-center gap-3">
                    <img src="/gada_logo.png" alt="Logo" className="w-48" />
                </div>

                {/* overflow-visible so the suggestions dropdown isn't clipped by the card */}
                <Card className="overflow-visible">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Create a vendor account</CardTitle>
                        <CardDescription>
                            Register your store. An admin must approve it before you can sign in.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {successMessage ? (
                            <div className="space-y-4">
                                <div className="bg-muted flex items-start gap-3 rounded-md px-3 py-3 text-sm">
                                    <CheckCircle2Icon className="text-primary mt-0.5 size-4 shrink-0" />
                                    <div className="space-y-1">
                                        <p className="font-medium">Waiting for approval</p>
                                        <p className="text-muted-foreground">{successMessage}</p>
                                        <p className="text-muted-foreground">
                                            You can sign in after an admin approves the account.
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="w-full">
                                    <Link to="/login">Back to login</Link>
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="full_name">Full name</Label>
                                    <Input
                                        id="full_name"
                                        autoComplete="name"
                                        placeholder="Ada Okonkwo"
                                        aria-invalid={!!errors.full_name}
                                        {...register("full_name")}
                                    />
                                    {errors.full_name && (
                                        <p className="text-destructive text-xs">{errors.full_name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        aria-invalid={!!errors.email}
                                        {...register("email")}
                                    />
                                    {errors.email && (
                                        <p className="text-destructive text-xs">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder="08012345678"
                                        aria-invalid={!!errors.phone}
                                        {...register("phone")}
                                    />
                                    {errors.phone && (
                                        <p className="text-destructive text-xs">{errors.phone.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            className="pr-10"
                                            aria-invalid={!!errors.password}
                                            {...register("password")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
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
                                    {errors.password && (
                                        <p className="text-destructive text-xs">{errors.password.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password_confirmation">Confirm password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            className="pr-10"
                                            aria-invalid={!!errors.password_confirmation}
                                            {...register("password_confirmation")}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((value) => !value)}
                                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOffIcon className="size-4" />
                                            ) : (
                                                <EyeIcon className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && (
                                        <p className="text-destructive text-xs">
                                            {errors.password_confirmation.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="business_name">Business name</Label>
                                    <Input
                                        id="business_name"
                                        placeholder="Mama Cass"
                                        aria-invalid={!!errors.business_name}
                                        {...register("business_name")}
                                    />
                                    {errors.business_name && (
                                        <p className="text-destructive text-xs">{errors.business_name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="type">Business type</Label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value || undefined}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger
                                                    id="type"
                                                    className="w-full"
                                                    aria-invalid={!!errors.type}
                                                >
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VENDOR_REGISTRATION_TYPES.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {vendorTypeLabels[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.type && (
                                        <p className="text-destructive text-xs">{errors.type.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-primary h-6 gap-1 px-2 text-xs"
                                            onClick={() => setMapOpen(true)}
                                        >
                                            <MapPinIcon className="size-3" />
                                            Pin on map
                                        </Button>
                                    </div>
                                    <AddressAutocomplete
                                        key={addressKey}
                                        id="address"
                                        placeholder="123 Main St, Lagos"
                                        defaultValue={address}
                                        error={!!errors.address}
                                        onChange={handleAddressTyped}
                                        onAddressSelect={applyLocation}
                                    />
                                    {errors.address && (
                                        <p className="text-destructive text-xs">{errors.address.message}</p>
                                    )}
                                </div>

                                <p className="text-muted-foreground text-xs">
                                    Pick a suggested address or drop a pin on the map.
                                </p>

                                {serverError && (
                                    <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                                        {serverError}
                                    </p>
                                )}

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Creating account…" : "Create account"}
                                </Button>

                                <p className="text-muted-foreground text-center text-sm">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="text-primary font-medium underline-offset-4 hover:underline"
                                    >
                                        Sign in
                                    </Link>
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>

            <MapPickerModal
                open={mapOpen}
                onOpenChange={setMapOpen}
                initialLat={Number(latitude) || undefined}
                initialLng={Number(longitude) || undefined}
                description="Drag the pin or click the map to set your store location."
                onConfirm={handleMapConfirm}
            />
        </div>
    )
}