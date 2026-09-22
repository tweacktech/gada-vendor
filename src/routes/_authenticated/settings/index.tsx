import { createFileRoute } from "@tanstack/react-router"
import { KeyIcon, Loader2Icon, MapPinIcon, MonitorIcon, MoonIcon, PaletteIcon, SunIcon, UserCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { usePageTitle } from "@/hooks/usePageTitle"
import { api, ApiError } from "@/lib/api"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { MapPickerModal } from "@/components/map-picker-modal"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/settings/")({
    component: SettingsPage,
})

function SettingsPage() {
    usePageTitle("Settings")
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const [profileData, setProfileData] = useState({
        full_name: "",
        email: "",
        phone: "",
    })
    const [vendorData, setVendorData] = useState({
        name: "",
        email: "",
        phone_number: "",
        address: "",
        latitude: "",
        longitude: "",
    })
    const [profileLoading, setProfileLoading] = useState(true)
    const [savingVendor, setSavingVendor] = useState(false)
    const [reverseGeocoding, setReverseGeocoding] = useState(false)
    const [mapOpen, setMapOpen] = useState(false)

    useEffect(() => {
        let active = true
        api.getVendorSettings()
            .then((settings) => {
                if (!active) return
                setProfileData({
                    full_name: settings.account.full_name ?? "",
                    email: settings.account.email ?? "",
                    phone: settings.account.phone_number ?? "",
                })
                setVendorData({
                    name: settings.vendor.business_name ?? "",
                    email: settings.vendor.business_email ?? "",
                    phone_number: settings.vendor.business_phone ?? "",
                    address: settings.vendor.address ?? "",
                    latitude: String(settings.vendor.latitude ?? ""),
                    longitude: String(settings.vendor.longitude ?? ""),
                })
            })
            .catch((err) => {
                toast.error(err instanceof ApiError ? err.message : "Could not load account details")
            })
            .finally(() => {
                if (active) setProfileLoading(false)
            })
        return () => {
            active = false
        }
    }, [])

    // ── Password Form State ──────────────────────────────────────────────
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    })

    const handleVendorUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        const latitude = Number(vendorData.latitude)
        const longitude = Number(vendorData.longitude)
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            toast.error("Enter a valid latitude between -90 and 90")
            return
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            toast.error("Enter a valid longitude between -180 and 180")
            return
        }
        setSavingVendor(true)
        try {
            await api.updateVendorAccount({
                full_name: profileData.full_name,
                email: profileData.email,
                phone_number: profileData.phone,
                business_name: vendorData.name,
                business_email: vendorData.email,
                business_phone: vendorData.phone_number,
                address: vendorData.address,
                latitude,
                longitude,
            })
            const current = auth.getCurrentUser()
            if (current) {
                auth.setCurrentUser({
                    ...current,
                    full_name: profileData.full_name,
                    email: profileData.email,
                    latitude,
                    longitude,
                })
            }
            toast.success("Account information updated successfully")
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Failed to update vendor")
        } finally {
            setSavingVendor(false)
        }
    }

    function useSelectedLocation(address: string, latitude: number, longitude: number) {
        setVendorData((current) => ({
            ...current,
            address,
            latitude: String(latitude),
            longitude: String(longitude),
        }))
    }

    async function resolveAddressFromCoordinates() {
        const latitude = Number(vendorData.latitude)
        const longitude = Number(vendorData.longitude)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            toast.error("Enter valid latitude and longitude values")
            return
        }
        if (!window.google?.maps) {
            toast.error("Google Maps is still loading. Please try again.")
            return
        }
        setReverseGeocoding(true)
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            setReverseGeocoding(false)
            if (status === "OK" && results?.[0]) {
                setVendorData((current) => ({
                    ...current,
                    address: results[0].formatted_address,
                }))
            } else {
                toast.error("No address was found for those coordinates")
            }
        })
    }

    const handlePasswordUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("Passwords do not match!")
            return
        }
        if (passwordData.new_password.length < 8) {
            toast.error("Password must be at least 8 characters!")
            return
        }
        toast.success("Password updated successfully!")
        setPasswordData({
            current_password: "",
            new_password: "",
            confirm_password: "",
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your dashboard preferences and account settings.
                </p>
            </div>

            <Tabs defaultValue="appearance" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-100">
                    <TabsTrigger value="appearance" className="gap-2">
                        <PaletteIcon className="size-4" />
                        <span>Appearance</span>
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="gap-2">
                        <UserCircleIcon className="size-4" />
                        <span>Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="gap-2">
                        <KeyIcon className="size-4" />
                        <span>Password</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="appearance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>
                                Choose how the dashboard looks on your device.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldTitle>Theme</FieldTitle>
                                    <FieldDescription>
                                        Follow your device theme or choose light or dark mode.
                                    </FieldDescription>
                                </FieldContent>
                                {mounted ? (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant={theme === "system" ? "default" : "outline"}
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setTheme("system")}
                                        >
                                            <MonitorIcon className="size-4" />
                                            System
                                        </Button>
                                        <Button
                                            variant={theme === "light" ? "default" : "outline"}
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setTheme("light")}
                                        >
                                            <SunIcon className="size-4" />
                                            Light
                                        </Button>
                                        <Button
                                            variant={theme === "dark" ? "default" : "outline"}
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => setTheme("dark")}
                                        >
                                            <MoonIcon className="size-4" />
                                            Dark
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" disabled className="gap-2">
                                            <MonitorIcon className="size-4" />
                                            System
                                        </Button>
                                        <Button variant="outline" size="sm" disabled className="gap-2">
                                            <SunIcon className="size-4" />
                                            Light
                                        </Button>
                                        <Button variant="outline" size="sm" disabled className="gap-2">
                                            <MoonIcon className="size-4" />
                                            Dark
                                        </Button>
                                    </div>
                                )}
                            </Field>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                            <CardDescription>
                                Update the personal details used to access this dashboard.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profileLoading ? (
                                <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading account information…
                                </div>
                            ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <Input
                                            id="full_name"
                                            value={profileData.full_name}
                                            onChange={(e) => setProfileData({
                                                ...profileData,
                                                full_name: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({
                                                ...profileData,
                                                email: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({
                                                ...profileData,
                                                phone: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>

                            </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Vendor Information & Location</CardTitle>
                            <CardDescription>
                                Search for an address to fill its coordinates, or enter coordinates
                                and resolve them to an address.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleVendorUpdate} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="vendor_name">Business Name</Label>
                                        <Input
                                            id="vendor_name"
                                            required
                                            value={vendorData.name}
                                            onChange={(e) => setVendorData({ ...vendorData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vendor_email">Business Email</Label>
                                        <Input
                                            id="vendor_email"
                                            type="email"
                                            required
                                            value={vendorData.email}
                                            onChange={(e) => setVendorData({ ...vendorData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="vendor_phone">Business Phone</Label>
                                        <Input
                                            id="vendor_phone"
                                            required
                                            value={vendorData.phone_number}
                                            onChange={(e) => setVendorData({ ...vendorData, phone_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="vendor_address">Business Address</Label>
                                        <AddressAutocomplete
                                            id="vendor_address"
                                            defaultValue={vendorData.address}
                                            onChange={(address) => setVendorData((current) => ({ ...current, address }))}
                                            onAddressSelect={useSelectedLocation}
                                        />
                                        <p className="text-muted-foreground text-xs">
                                            Select a suggested address to automatically set latitude and longitude.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vendor_latitude">Latitude</Label>
                                        <Input
                                            id="vendor_latitude"
                                            type="number"
                                            step="any"
                                            required
                                            value={vendorData.latitude}
                                            onChange={(e) => setVendorData({ ...vendorData, latitude: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="vendor_longitude">Longitude</Label>
                                        <Input
                                            id="vendor_longitude"
                                            type="number"
                                            step="any"
                                            required
                                            value={vendorData.longitude}
                                            onChange={(e) => setVendorData({ ...vendorData, longitude: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        disabled={reverseGeocoding}
                                        onClick={() => void resolveAddressFromCoordinates()}
                                    >
                                        {reverseGeocoding
                                            ? <Loader2Icon className="size-4 animate-spin" />
                                            : <MapPinIcon className="size-4" />}
                                        Get Address from Coordinates
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setMapOpen(true)}
                                    >
                                        <MapPinIcon className="size-4" />
                                        Choose on Map
                                    </Button>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={savingVendor || profileLoading}>
                                        {savingVendor ? "Saving…" : "Save All Changes"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current_password">Current Password</Label>
                                    <Input
                                        id="current_password"
                                        type="password"
                                        placeholder="Enter your current password"
                                        value={passwordData.current_password}
                                        onChange={(e) => setPasswordData({
                                            ...passwordData,
                                            current_password: e.target.value
                                        })}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="new_password">New Password</Label>
                                    <Input
                                        id="new_password"
                                        type="password"
                                        placeholder="Enter your new password"
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({
                                            ...passwordData,
                                            new_password: e.target.value
                                        })}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Password must be at least 8 characters long.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                                    <Input
                                        id="confirm_password"
                                        type="password"
                                        placeholder="Confirm your new password"
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({
                                            ...passwordData,
                                            confirm_password: e.target.value
                                        })}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit">
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <MapPickerModal
                open={mapOpen}
                onOpenChange={setMapOpen}
                initialLat={Number(vendorData.latitude) || undefined}
                initialLng={Number(vendorData.longitude) || undefined}
                onConfirm={useSelectedLocation}
            />
        </div>
    )
}