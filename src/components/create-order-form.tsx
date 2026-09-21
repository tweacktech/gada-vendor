import { useEffect, useState } from "react"
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2Icon, MapIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { api } from "@/lib/api"
import { ApiError } from "@/lib/api"
import type { Vendor } from "@/types/logistics"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"


// ── Zod schema ────────────────────────────────────────────────────────────────

const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/

const deliveryPointSchema = z.object({
    customer_name: z.string().min(2, "Name must be at least 2 characters"),
    customer_phone: z
        .string()
        .regex(phoneRegex, "Enter a valid phone number"),
    delivery_address: z.string().min(5, "Delivery address is required"),
    delivery_latitude: z.coerce.number().default(0),
    delivery_longitude: z.coerce.number().default(0),
    product_category: z.string().min(1, "Product category is required"),
    // Derived from the multi-select; stored as a "*"-delimited string
    item_description: z.string().min(1, "Please select at least one item"),
    amount: z.coerce.number({ message: "Enter a valid delivery fee" })
        .positive("Delivery fee must be greater than 0"),
})

const createOrderSchema = z.object({
    vendor_id: z.string().min(1, "Please select a vendor"),

    pickup_address: z.string().min(5, "Pickup address is required"),
    pickup_latitude: z.coerce.number(),
    pickup_longitude: z.coerce.number(),

    orders: z.array(deliveryPointSchema).min(1, "Add at least one delivery point"),
})

type CreateOrderValues = z.infer<typeof createOrderSchema>

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreateOrderFormProps {
    onSuccess: (orderId: string) => void
}

// ── Per-point items multi-select ───────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


export function CreateOrderForm({ onSuccess }: CreateOrderFormProps) {
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [vendorsLoading, setVendorsLoading] = useState(true)

    // Map picker state
    const [mapPickerIndex, setMapPickerIndex] = useState<number | null>(null)

    // Load vendors for the select
    useEffect(() => {
        api.getVendors()
            .then(setVendors)
            .catch(() => toast.error("Could not load vendors"))
            .finally(() => setVendorsLoading(false))
    }, [])

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CreateOrderValues>({
        resolver: standardSchemaResolver(createOrderSchema),
        defaultValues: {
            pickup_latitude: 0,
            pickup_longitude: 0,
            orders: [
                {
                    customer_name: "",
                    customer_phone: "",
                    delivery_address: "",
                    delivery_latitude: 0,
                    delivery_longitude: 0,
                    product_category: "Food",
                    item_description: "",
                    amount: 0,
                },
            ],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "orders",
    })

    const selectedVendorId = useWatch({ control, name: "vendor_id" })
    const pickupAddress = useWatch({ control, name: "pickup_address" })
    const watchedOrders = useWatch({ control, name: "orders" })

    // Autofill pickup address when vendor changes
    useEffect(() => {
        const vendor = vendors.find((v) => v.id === selectedVendorId)
        if (vendor) {
            setValue("pickup_address", vendor.address, { shouldValidate: true })
            // Real coordinates would come from the vendor record; using 0 as placeholder
            setValue("pickup_latitude", 0)
            setValue("pickup_longitude", 0)
        }
    }, [selectedVendorId, vendors, setValue])

    // Form submit handler
    const onSubmit = async (values: CreateOrderValues) => {
        try {
            const result = await api.createBulkOrders({
                pickup: {
                    address: values.pickup_address,
                    latitude: values.pickup_latitude,
                    longitude: values.pickup_longitude,
                },
                orders: values.orders.map((order) => ({
                    delivery: {
                        address: order.delivery_address,
                        latitude: order.delivery_latitude,
                        longitude: order.delivery_longitude,
                    },
                    customer_details: {
                        name: order.customer_name,
                        phone_number: order.customer_phone,
                    },
                    product_category: order.product_category,
                    item_description: order.item_description,
                    amount: order.amount,
                })),
            })

            toast.success("Order created", {
                description: `${values.orders.length} delivery point${values.orders.length === 1 ? "" : "s"} submitted for one pickup.`,
            })

            if (result.orderId) {
                onSuccess(result.orderId)
            } else {
                toast.warning("Order created, but no order ID was returned.")
            }
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : "Failed to create order. Please try again."
            toast.error("Error creating order", { description: message })
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="flex flex-col gap-6">

                    {/* ── Pickup ───────────────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Pickup</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                {/* Vendor select */}
                                <Field>
                                    <FieldLabel htmlFor="vendor_id">Vendor (Restaurant)</FieldLabel>
                                    <Controller
                                        name="vendor_id"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={vendorsLoading}
                                            >
                                                <SelectTrigger
                                                    id="vendor_id"
                                                    className="w-full"
                                                    aria-invalid={!!errors.vendor_id}
                                                >
                                                    <SelectValue
                                                        placeholder={
                                                            vendorsLoading
                                                                ? "Loading vendors…"
                                                                : "Select a vendor"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {vendors.map((v) => (
                                                        <SelectItem key={v.id} value={v.id}>
                                                            {v.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <FieldError errors={[errors.vendor_id]} />
                                </Field>

                                {/* Pickup address — autofilled from vendor or typed */}
                                <Field>
                                    <FieldLabel htmlFor="pickup_address">Pickup Address</FieldLabel>
                                    <AddressAutocomplete
                                        id="pickup_address"
                                        placeholder="Autofilled when vendor is selected"
                                        defaultValue={pickupAddress}
                                        onChange={(val) => setValue("pickup_address", val, { shouldValidate: true })}
                                        onAddressSelect={(address, lat, lng) => {
                                            setValue("pickup_address", address, { shouldValidate: true })
                                            setValue("pickup_latitude", lat)
                                            setValue("pickup_longitude", lng)
                                        }}
                                        error={!!errors.pickup_address}
                                    />
                                    <FieldError errors={[errors.pickup_address]} />
                                </Field>
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    {/* ── Delivery points ─────────────────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Delivery Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                {fields.map((field, index) => {
                                    const pointErrors = errors.orders?.[index]
                                    return (
                                        <div
                                            key={field.id}
                                            className="rounded-lg border bg-muted/20 p-4"
                                        >
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-medium">
                                                    Delivery point {index + 1}
                                                </h3>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => remove(index)}
                                                    disabled={fields.length === 1}
                                                    aria-label={`Remove delivery point ${index + 1}`}
                                                >
                                                    <Trash2Icon className="size-4" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field>
                                                    <FieldLabel htmlFor={`orders.${index}.customer_name`}>
                                                        Customer Name
                                                    </FieldLabel>
                                                    <Input
                                                        id={`orders.${index}.customer_name`}
                                                        placeholder="e.g. Jane Doe"
                                                        aria-invalid={!!pointErrors?.customer_name}
                                                        {...register(`orders.${index}.customer_name`)}
                                                    />
                                                    <FieldError errors={[pointErrors?.customer_name]} />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor={`orders.${index}.customer_phone`}>
                                                        Phone Number
                                                    </FieldLabel>
                                                    <Input
                                                        id={`orders.${index}.customer_phone`}
                                                        type="tel"
                                                        placeholder="e.g. 08098765432"
                                                        aria-invalid={!!pointErrors?.customer_phone}
                                                        {...register(`orders.${index}.customer_phone`)}
                                                    />
                                                    <FieldError errors={[pointErrors?.customer_phone]} />
                                                </Field>
                                            </div>

                                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                <Field>
                                                    <div className="flex items-center justify-between">
                                                        <FieldLabel htmlFor={`orders.${index}.delivery_address`}>
                                                            Delivery Address
                                                        </FieldLabel>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setMapPickerIndex(index)}
                                                            className="h-6 px-2 text-xs text-primary gap-1"
                                                        >
                                                            <MapIcon className="size-3" />
                                                            Pin on map
                                                        </Button>
                                                    </div>
                                                    <AddressAutocomplete
                                                        id={`orders.${index}.delivery_address`}
                                                        placeholder="e.g. 25 Admiralty Way, Lekki"
                                                        defaultValue={watchedOrders?.[index]?.delivery_address}
                                                        onChange={(val) =>
                                                            setValue(`orders.${index}.delivery_address`, val, {
                                                                shouldValidate: true,
                                                            })
                                                        }
                                                        onAddressSelect={(address, lat, lng) => {
                                                            setValue(`orders.${index}.delivery_address`, address, {
                                                                shouldValidate: true,
                                                            })
                                                            setValue(`orders.${index}.delivery_latitude`, lat)
                                                            setValue(`orders.${index}.delivery_longitude`, lng)
                                                        }}
                                                        error={!!pointErrors?.delivery_address}
                                                    />
                                                    <FieldError errors={[pointErrors?.delivery_address]} />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor={`orders.${index}.product_category`}>
                                                        Product Category
                                                    </FieldLabel>
                                                    <Input
                                                        id={`orders.${index}.product_category`}
                                                        placeholder="Food"
                                                        aria-invalid={!!pointErrors?.product_category}
                                                        {...register(`orders.${index}.product_category`)}
                                                    />
                                                    <FieldError errors={[pointErrors?.product_category]} />
                                                </Field>
                                            </div>

                                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                <Field>
                                                    <FieldLabel htmlFor={`orders.${index}.item_description`}>
                                                        Items
                                                    </FieldLabel>
                                                    <Input
                                                        id={`orders.${index}.item_description`}
                                                        placeholder="Enter item description"
                                                        aria-invalid={!!pointErrors?.item_description}
                                                        {...register(`orders.${index}.item_description`)}
                                                    />
                                                    <FieldError errors={[pointErrors?.item_description]} />
                                                </Field>

                                                <Field>
                                                    <FieldLabel htmlFor={`orders.${index}.amount`}>
                                                        Delivery Fee (₦)
                                                    </FieldLabel>
                                                    <Input
                                                        id={`orders.${index}.amount`}
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        placeholder="e.g. 1500"
                                                        aria-invalid={!!pointErrors?.amount}
                                                        {...register(`orders.${index}.amount`)}
                                                    />
                                                    <FieldError errors={[pointErrors?.amount]} />
                                                </Field>
                                            </div>
                                            {index === fields.length - 1 && (
                                                <div className="mt-4 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() =>
                                                            append({
                                                                customer_name: "",
                                                                customer_phone: "",
                                                                delivery_address: "",
                                                                delivery_latitude: 0,
                                                                delivery_longitude: 0,
                                                                product_category: "Food",
                                                                item_description: "",
                                                                amount: 0,
                                                            })
                                                        }
                                                    >
                                                        <PlusIcon className="size-4" />
                                                        Add delivery point
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                <FieldError errors={[errors.orders]} />
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    {/* ── Submit ───────────────────────────────────────────── */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => history.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
                            {isSubmitting ? "Creating order…" : "Create Order"}
                        </Button>
                    </div>
                </div>
            </form>
            {/* ── Delivery Map Picker Modal ─────────────────────────────────── */}
            <MapPickerModal
                open={mapPickerIndex !== null}
                onOpenChange={(open) => {
                    if (!open) setMapPickerIndex(null)
                }}
                initialLat={mapPickerIndex === null ? 0 : watchedOrders?.[mapPickerIndex]?.delivery_latitude}
                initialLng={mapPickerIndex === null ? 0 : watchedOrders?.[mapPickerIndex]?.delivery_longitude}
                onConfirm={(address, lat, lng) => {
                    if (mapPickerIndex === null) return
                    setValue(`orders.${mapPickerIndex}.delivery_address`, address, { shouldValidate: true })
                    setValue(`orders.${mapPickerIndex}.delivery_latitude`, lat)
                    setValue(`orders.${mapPickerIndex}.delivery_longitude`, lng)
                    setMapPickerIndex(null)
                }}
            />
        </>
    )
}
