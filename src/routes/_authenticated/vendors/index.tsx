import { createFileRoute } from "@tanstack/react-router"

import { useState } from "react"
import { PlusIcon, RefreshCwIcon, StoreIcon } from "lucide-react"

import { useVendors } from "@/hooks/useVendors"
import { usePageTitle } from "@/hooks/usePageTitle"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateVendorSheet } from "@/components/create-vendor-sheet"

export const Route = createFileRoute("/_authenticated/vendors/")({
    component: VendorsPage,
})

function VendorsPage() {
    usePageTitle("Vendors")

    const [sheetOpen, setSheetOpen] = useState(false)

    const { vendors, isLoading, error, refetch } = useVendors()

    const isError = !!error

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
                    <p className="text-muted-foreground text-sm">
                        Vendors linked under this admin account.
                    </p>
                </div>
                <Button onClick={() => setSheetOpen(true)} className="gap-2">
                    <PlusIcon className="size-4" />
                    Create Vendor
                </Button>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <StoreIcon className="size-5 text-muted-foreground" />
                        Active Vendors
                    </CardTitle>
                    {isError && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            className="text-destructive hover:text-destructive gap-1.5 h-8"
                        >
                            <RefreshCwIcon className="size-3.5" />
                            Retry
                        </Button>
                    )}
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">Vendor Name</TableHead>
                                    <TableHead>Email Address</TableHead>
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Location</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    // Loading skeletons
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : isError ? (
                                    // Error state
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-destructive">
                                            {error}
                                        </TableCell>
                                    </TableRow>
                                ) : vendors?.length === 0 ? (
                                    // Empty state
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No vendors found. Click "Create Vendor" to add one.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    // Data rows
                                    vendors?.map((vendor) => (
                                        <TableRow key={vendor.id}>
                                            <TableCell className="font-medium">
                                                {vendor.business_name ?? vendor.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {vendor.email || "—"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                                                {vendor.phone_number || "—"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-xs text-sm" title={vendor.address}>
                                                {vendor.address || "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Creation Slide-out Sheet */}
            <CreateVendorSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onSuccess={() => refetch()}
            />
        </div>
    )
}
