import { useState, useRef, useEffect } from "react"
import { useLoadScript, Autocomplete } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"

// We load the Places API library for the autocomplete component
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"]

interface AddressAutocompleteProps {
    id?: string
    placeholder?: string
    defaultValue?: string
    // Called when the user selects an address from the dropdown
    onAddressSelect: (address: string, lat: number, lng: number) => void
    // Allows react-hook-form or other state to track raw typing
    onChange?: (val: string) => void
    className?: string
    error?: boolean
}

export function AddressAutocomplete({
    id,
    placeholder = "Search for an address...",
    defaultValue = "",
    onAddressSelect,
    onChange,
    className,
    error,
}: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(defaultValue)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

    // Sync external default value when it changes (e.g. from form reset or autofill)
    useEffect(() => {
        setInputValue(defaultValue)
    }, [defaultValue])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)
        onChange?.(val)
    }

    const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete
    }

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace()

            if (place.formatted_address && place.geometry && place.geometry.location) {
                const address = place.formatted_address
                const lat = place.geometry.location.lat()
                const lng = place.geometry.location.lng()

                setInputValue(address)
                onChange?.(address)
                onAddressSelect(address, lat, lng)
            }
        }
    }

    // Load the script
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries,
    })

    if (loadError) {
        return (
            <div className="text-destructive text-sm flex h-10 items-center">
                Failed to load Google Maps script.
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="relative">
                <Input
                    id={id}
                    placeholder="Loading Maps..."
                    disabled
                    className={className}
                />
                <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
                fields: ["formatted_address", "geometry.location"],
                // Restrict to Nigeria for Gadatastia
                componentRestrictions: { country: "ng" }
            }}
        >
            <Input
                id={id}
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                aria-invalid={error}
                className={className}
                // Stop form submission if user hits enter while selecting a dropdown item
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                    }
                }}
            />
        </Autocomplete>
    )
}
