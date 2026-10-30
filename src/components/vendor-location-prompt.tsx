import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { MapPickerModal } from "@/components/map-picker-modal"
import { api, ApiError } from "@/lib/api"
import { auth } from "@/lib/auth"

function hasCoordinate(value: unknown): boolean {
    if (value === null || value === undefined || value === "") return false
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed !== 0
}

/**
 * Blocking prompt shown to a vendor admin whose store has no coordinates.
 * It stays open until a location is saved. Mounted once in the dashboard
 * layout, so it appears on every authenticated page until the location is set.
 */
export function VendorLocationPrompt() {
    const [open, setOpen] = useState(false)
    const [initial, setInitial] = useState<{ lat?: number; lng?: number }>({})
    const savingRef = useRef(false)

    useEffect(() => {
        let active = true
        api.getVendorSettings()
            .then((settings) => {
                if (!active) return
                const vendor = settings.vendor
                if (hasCoordinate(vendor.latitude) && hasCoordinate(vendor.longitude)) return
                setInitial({
                    lat: hasCoordinate(vendor.latitude) ? Number(vendor.latitude) : undefined,
                    lng: hasCoordinate(vendor.longitude) ? Number(vendor.longitude) : undefined,
                })
                setOpen(true)
            })
            .catch(() => {
                // Not a vendor account, or settings unavailable: nothing to prompt for.
            })
        return () => {
            active = false
        }
    }, [])

    async function handleConfirm(address: string, latitude: number, longitude: number) {
        if (savingRef.current) return
        savingRef.current = true
        try {
            await api.updateVendorLocation({ address, latitude, longitude })
            const current = auth.getCurrentUser()
            if (current) {
                auth.setCurrentUser({ ...current, latitude, longitude })
            }
            toast.success("Store location saved")
            setOpen(false)
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not save the store location")
            setOpen(true)
        } finally {
            savingRef.current = false
        }
    }

    return (
        <MapPickerModal
            open={open}
            onOpenChange={() => {
                // Non-dismissible: the store location must be set first.
            }}
            dismissible={false}
            initialLat={initial.lat}
            initialLng={initial.lng}
            description="Your store has no location yet. Drag the pin or click the map to set your store's exact location. Riders use this to find you."
            onConfirm={handleConfirm}
        />
    )
}
