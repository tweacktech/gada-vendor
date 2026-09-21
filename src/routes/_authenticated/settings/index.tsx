import { createFileRoute } from "@tanstack/react-router"
import { MoonIcon, SunIcon, KeyIcon, PaletteIcon, UserCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { usePageTitle } from "@/hooks/usePageTitle"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

    // ── Profile Form State ────────────────────────────────────────────────
    const [profileData, setProfileData] = useState({
        full_name: "John Doe",
        email: "john@example.com",
        phone: "+234 801 234 5678",
        address: "123 Main St, Lagos, Nigeria",
    })

    // ── Password Form State ──────────────────────────────────────────────
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    })

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        toast.success("Profile updated successfully!")
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
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
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
                                        Switch between light and dark mode.
                                    </FieldDescription>
                                </FieldContent>
                                {mounted ? (
                                    <div className="flex gap-2">
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
                                    <div className="flex gap-2">
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
                            <CardTitle>Edit Profile</CardTitle>
                            <CardDescription>
                                Update your personal information and contact details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                {/* Avatar */}
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-16">
                                        <AvatarImage src="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png" />
                                        <AvatarFallback>JD</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Button type="button" variant="outline" size="sm">
                                            Change Avatar
                                        </Button>
                                        <p className="text-muted-foreground text-xs mt-1">
                                            PNG, JPG up to 2MB
                                        </p>
                                    </div>
                                </div>

                                <Separator />

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
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={profileData.address}
                                            onChange={(e) => setProfileData({
                                                ...profileData,
                                                address: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit">
                                        Save Changes
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
        </div>
    )
}