import { useEffect, useMemo, useState } from "react"
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
import { buildNearbyRidersParams, getDefaultRiderSearchRadius } from "@/lib/vendor-location"

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

type RiderFilter = "nearby" | "all"

interface Props {
    orderId?: string
    orderIds?: string[]
    orderNumber: string
    riders?: Rider[]
    loadingRiders?: boolean
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
    riders: initialRiders = [],
    loadingRiders: initialLoading = false,
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
    const [filter, setFilter] = useState<RiderFilter>("nearby")
    const [riders, setRiders] = useState<Rider[]>(initialRiders)
    const [loadingRiders, setLoadingRiders] = useState(initialLoading)
    const [resolvedLat, setResolvedLat] = useState<number | null>(referenceLat ?? null)
    const [resolvedLng, setResolvedLng] = useState<number | null>(referenceLng ?? null)

    const hasReference =
        typeof resolvedLat === "number" &&
        Number.isFinite(resolvedLat) &&
        typeof resolvedLng === "number" &&
        Number.isFinite(resolvedLng)

    useEffect(() => {
        if (!open) {
            setAssignedId(null)
            setError(null)
            setSearchQuery("")
            return
        }

        let cancelled = false

        async function loadRiders() {
            setLoadingRiders(true)
            setError(null)
            try {
                const fallback =
                    referenceLat != null && referenceLng != null
                        ? { latitude: referenceLat, longitude: referenceLng }
                        : null
                const nearbyParams = await buildNearbyRidersParams(fallback)
                if (nearbyParams?.latitude != null && nearbyParams.longitude != null && !cancelled) {
                    setResolvedLat(nearbyParams.latitude)
                    setResolvedLng(nearbyParams.longitude)
                }

                const list = await api.getAvailableRiders(
                    filter === "nearby" && nearbyParams
                        ? nearbyParams
                        : { availability_status: "available" }
                )
                if (!cancelled) setRiders(list)
            } catch (err) {
                if (!cancelled) {
                    setRiders([])
                    setError(err instanceof ApiError ? err.message : "Failed to load riders")
                }
            } finally {
                if (!cancelled) setLoadingRiders(false)
            }
        }

        void loadRiders()
        return () => {
            cancelled = true
        }
    }, [open, filter, referenceLat, referenceLng])

    const sortedRiders = useMemo(
        () =>
            hasReference
                ? sortRidersByDistance(riders, resolvedLat as number, resolvedLng as number)
                : riders.map((r) => ({ ...r, distanceKm: Number.POSITIVE_INFINITY })),
        [riders, hasReference, resolvedLat, resolvedLng]
    )

    const nearbyRadius = getDefaultRiderSearchRadius()
    const visibleRiders = useMemo(() => {
        if (filter === "nearby" && hasReference) {
            return sortedRiders.filter((rider) => rider.distanceKm <= nearbyRadius)
        }
        return sortedRiders
    }, [filter, hasReference, nearbyRadius, sortedRiders])

    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredRiders = useMemo(() => {
        if (!normalizedSearchQuery) return visibleRiders
        return visibleRiders.filter((rider) => {
            const searchableText = [getRiderDisplayName(rider), rider.phone, rider.availability_status]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
            return searchableText.includes(normalizedSearchQuery)
        })
    }, [normalizedSearchQuery, visibleRiders])

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

                <div className="space-y-3 border-b px-6 py-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={filter === "nearby" ? "default" : "outline"}
                            onClick={() => setFilter("nearby")}
                        >
                            Nearby
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={filter === "all" ? "default" : "outline"}
                            onClick={() => setFilter("all")}
                        >
                            All riders
                        </Button>
                    </div>
                    <div className="relative">
                        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search riders by name or phone"
                            className="pl-9"
                            disabled={loadingRiders}
                        />
                    </div>
                    {filter === "nearby" && (
                        <p className="text-muted-foreground text-xs">
                            Showing riders within {nearbyRadius} km
                            {!hasReference && " · vendor location unavailable, listing all available riders"}
                        </p>
                    )}
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
                    ) : visibleRiders.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16">
                            <UserRoundIcon className="size-10 opacity-30" />
                            <p className="text-sm">
                                {filter === "nearby" ? "No nearby riders right now." : "No available riders right now."}
                            </p>
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
                                                {hasReference && Number.isFinite(rider.distanceKm) && (
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
