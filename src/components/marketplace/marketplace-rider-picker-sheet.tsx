import { useMemo, useState } from "react"
import {
    CheckIcon,
    Loader2Icon,
    MapPinIcon,
    PhoneIcon,
    SearchIcon,
    UserRoundIcon,
} from "lucide-react"

import type { Rider } from "@/types/logistics"
import { api, ApiError } from "@/lib/api"
import { sortRidersByDistance } from "@/lib/distance"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
    orderId?: string
    orderIds?: string[]
    orderNumber: string
    riders: Rider[]
    loadingRiders: boolean
    /** Reference point (e.g. delivery address) used to sort riders by proximity, if known. */
    referenceLat?: number | null
    referenceLng?: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onDone: () => void
}

function formatDistance(km: number): string {
    if (!Number.isFinite(km)) return "Distance unavailable"
    if (km < 1) return `${Math.round(km * 1000)} m away`
    return `${km.toFixed(1)} km away`
}

function getRiderDisplayName(rider: Rider): string {
    return rider.name?.trim() || "Unnamed rider"
}

export function MarketplaceRiderPickerSheet({
    orderId,
    orderIds,
    orderNumber,
    riders,
    loadingRiders,
    referenceLat,
    referenceLng,
    open,
    onOpenChange,
    onDone,
}: Props) {
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [assignedId, setAssignedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const hasReference =
        typeof referenceLat === "number" &&
        Number.isFinite(referenceLat) &&
        typeof referenceLng === "number" &&
        Number.isFinite(referenceLng)

    const sortedRiders = useMemo(
        () =>
            hasReference
                ? sortRidersByDistance(riders, referenceLat as number, referenceLng as number)
                : riders.map((r) => ({ ...r, distanceKm: Number.POSITIVE_INFINITY })),
        [riders, hasReference, referenceLat, referenceLng]
    )

    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredRiders = useMemo(() => {
        if (!normalizedSearchQuery) return sortedRiders
        return sortedRiders.filter((rider) => {
            const searchableText = [getRiderDisplayName(rider), rider.phone, rider.availability_status]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
            return searchableText.includes(normalizedSearchQuery)
        })
    }, [normalizedSearchQuery, sortedRiders])

    async function handleAssign(riderId: string) {
        setAssigningId(riderId)
        setError(null)
        try {
            const targetOrderIds = orderIds ?? (orderId ? [orderId] : [])
            if (targetOrderIds.length > 1) {
                await api.batchAssignRiderToMarketplaceOrders(targetOrderIds, riderId)
            } else if (targetOrderIds[0]) {
                await api.assignRiderToMarketplaceOrder(targetOrderIds[0], riderId)
            } else {
                throw new Error("No marketplace orders were selected.")
            }
            setAssignedId(riderId)
            setTimeout(onDone, 800)
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to assign rider. Please try again.")
        } finally {
            setAssigningId(null)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-6 py-5">
                    <SheetTitle>Assign a Rider</SheetTitle>
                    <SheetDescription>
                        Select a rider to deliver{" "}
                        <span className="text-foreground font-mono">{orderNumber}</span>.
                    </SheetDescription>
                </SheetHeader>

                {error && (
                    <div className="border-destructive/30 bg-destructive/10 text-destructive mx-6 mt-4 rounded-lg border px-4 py-2 text-sm">
                        {error}
                    </div>
                )}

                <div className="border-b px-6 py-4">
                    <div className="relative">
                        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search riders by name or phone"
                            className="pl-9"
                            disabled={loadingRiders || riders.length === 0}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingRiders ? (
                        <div className="flex flex-col gap-3 px-6 py-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="size-10 shrink-0 rounded-full" />
                                    <div className="flex flex-1 flex-col gap-1.5">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </div>
                                    <Skeleton className="h-8 w-16 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : sortedRiders.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16">
                            <UserRoundIcon className="size-10 opacity-30" />
                            <p className="text-sm">No available riders right now.</p>
                        </div>
                    ) : filteredRiders.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                            <SearchIcon className="size-10 opacity-30" />
                            <p className="text-sm">No riders match your search.</p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {filteredRiders.map((rider) => {
                                const isAssigning = assigningId === rider.id
                                const isDone = assignedId === rider.id
                                const displayName = getRiderDisplayName(rider)
                                return (
                                    <li key={rider.id} className="flex items-center gap-3 px-6 py-4">
                                        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate text-sm font-medium">{displayName}</span>
                                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                                                {rider.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <PhoneIcon className="size-3" />
                                                        {rider.phone}
                                                    </span>
                                                )}
                                                {hasReference && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPinIcon className="size-3" />
                                                        {formatDistance(rider.distanceKm)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className="hidden shrink-0 rounded-sm bg-green-500/10 text-xs text-green-600 capitalize sm:inline-flex dark:text-green-400">
                                            {rider.availability_status}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant={isDone ? "default" : "outline"}
                                            disabled={isAssigning || isDone || assigningId !== null}
                                            onClick={() => handleAssign(rider.id)}
                                            className="shrink-0"
                                        >
                                            {isAssigning ? (
                                                <Loader2Icon className="size-3.5 animate-spin" />
                                            ) : isDone ? (
                                                <CheckIcon className="size-3.5" />
                                            ) : (
                                                "Assign"
                                            )}
                                        </Button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="border-t">
                    <Button variant="ghost" onClick={onDone} className="w-full">
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
