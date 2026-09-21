import { useState, useCallback, useRef, useEffect } from "react"
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api"
import { Loader2Icon, MapPinIcon } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"]

// Default center to Lagos, Nigeria
const defaultCenter = { lat: 6.5244, lng: 3.3792 }

interface MapPickerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialLat?: number
    initialLng?: number
    onConfirm: (address: string, lat: number, lng: number) => void
}


export function MapPickerModal({
    open,
    onOpenChange,
    initialLat,
    initialLng,
    onConfirm,
}: MapPickerModalProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
    })

    const [center, setCenter] = useState(defaultCenter)
    const [markerPos, setMarkerPos] = useState(defaultCenter)
    const [addressStr, setAddressStr] = useState("")
    const [isGeocoding, setIsGeocoding] = useState(false)

    const mapRef = useRef<google.maps.Map | null>(null)
    const geocoderRef = useRef<google.maps.Geocoder | null>(null)

    // Setup initial coordinates if provided
    useEffect(() => {
        if (open) {
            if (initialLat && initialLng && initialLat !== 0 && initialLng !== 0) {
                const pos = { lat: initialLat, lng: initialLng }
                setCenter(pos)
                setMarkerPos(pos)
                geocodePosition(pos)
            } else {
                setCenter(defaultCenter)
                setMarkerPos(defaultCenter)
                geocodePosition(defaultCenter)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialLat, initialLng])

    const geocodePosition = (pos: google.maps.LatLngLiteral | google.maps.LatLng) => {
        if (!geocoderRef.current) {
            geocoderRef.current = new window.google.maps.Geocoder()
        }

        setIsGeocoding(true)
        geocoderRef.current.geocode({ location: pos }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                setAddressStr(results[0].formatted_address)
            } else {
                setAddressStr("Unknown location")
            }
            setIsGeocoding(false)
        })
    }

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map
    }, [])

    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
            setMarkerPos(pos)
            geocodePosition(pos)
        }
    }

    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
            setMarkerPos(pos)
            geocodePosition(pos)
        }
    }

    const handleConfirm = () => {
        onConfirm(addressStr, markerPos.lat, markerPos.lng)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Select Exact Location</DialogTitle>
                    <DialogDescription>
                        Drag the pin or click on the map to select the exact delivery location.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative h-[400px] w-full bg-muted">
                    {loadError ? (
                        <div className="flex h-full items-center justify-center text-destructive">
                            Failed to load Google Maps
                        </div>
                    ) : !isLoaded ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                            <Loader2Icon className="size-5 animate-spin" />
                            Loading Map...
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={center}
                            zoom={14}
                            onLoad={onMapLoad}
                            onClick={onMapClick}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                            }}
                        >
                            <Marker
                                position={markerPos}
                                draggable={true}
                                onDragEnd={onMarkerDragEnd}
                                animation={window.google.maps.Animation.DROP}
                            />
                        </GoogleMap>
                    )}
                </div>

                <div className="p-6 pt-0 space-y-4">
                    <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-md">
                        <MapPinIcon className="size-5 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1 text-sm">
                            <span className="font-medium block mb-1">Selected Address</span>
                            {isGeocoding ? (
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Loader2Icon className="size-3 animate-spin" /> Fetching address...
                                </span>
                            ) : (
                                <span>{addressStr || "Move marker to fetch address"}</span>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!isLoaded || isGeocoding || !addressStr}
                        >
                            Confirm Location
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
