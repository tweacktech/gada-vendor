import { useMemo, useState } from "react"
import {
    CheckIcon,
    Loader2Icon,
    MapPinIcon,
    PhoneIcon,
    SearchIcon,
    UserRoundIcon,
} from "lucide-react"

import type { Order, Rider } from "@/types/logistics"
import { api, ApiError } from "@/lib/api"
import { sortRidersByDistance } from "@/lib/distance"
import { getOrderApiId } from "@/lib/order-batches"

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiderPickerSheetProps {
    /** The newly created order, used for pickup coords + assigning. */
    order: Order
    /** Available riders already fetched by the caller. */
    riders: Rider[]
    /** Whether riders are still being fetched. */
    loadingRiders: boolean
    /** Controls sheet open state. */
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Called once a rider is successfully assigned (or skipped). */
    onDone: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDistance(km: number): string {
    if (!Number.isFinite(km)) return "Distance unavailable"
    if (km < 1) return `${Math.round(km * 1000)} m away`
    return `${km.toFixed(1)} km away`
}

function getRiderDisplayName(rider: Rider): string {
    return rider.name?.trim() || "Unnamed rider"
}

function getRiderInitial(rider: Rider): string {
    return getRiderDisplayName(rider).charAt(0).toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RiderPickerSheet({
    order,
    riders,
    loadingRiders,
    open,
    onOpenChange,
    onDone,
}: RiderPickerSheetProps) {
    const [assigningId, setAssigningId] = useState<string | null>(null)
    const [assignedId, setAssignedId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const { latitude: pickupLat, longitude: pickupLng } = order.pickup_location

    const sortedRiders = useMemo(
        () => sortRidersByDistance(riders, pickupLat, pickupLng),
        [riders, pickupLat, pickupLng]
    )
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredRiders = useMemo(() => {
        if (!normalizedSearchQuery) return sortedRiders

        return sortedRiders.filter((rider) => {
            const searchableText = [
                getRiderDisplayName(rider),
                rider.phone,
                rider.availability_status,
            ]
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
            await api.assignRider(getOrderApiId(order), riderId)
            setAssignedId(riderId)
            // Brief pause so the checkmark is visible, then close
            setTimeout(onDone, 800)
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.message
                    : "Failed to assign rider. Please try again."
            setError(msg)
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
                        Auto-assignment was unavailable. Select a rider manually for order{" "}
                        <span className="font-mono text-foreground">
                            #{order.id.slice(0, 8)}
                        </span>
                        .
                    </SheetDescription>
                </SheetHeader>

                {/* Error banner */}
                {error && (
                    <div className="mx-6 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="border-b px-6 py-4">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search riders by name or phone"
                            className="pl-9"
                            disabled={loadingRiders || riders.length === 0}
                        />
                    </div>
                </div>

                {/* Rider list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingRiders ? (
                        <div className="flex flex-col gap-3 px-6 py-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="size-10 rounded-full shrink-0" />
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <Skeleton className="h-4 w-32 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </div>
                                    <Skeleton className="h-8 w-16 rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : sortedRiders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                            <UserRoundIcon className="size-10 opacity-30" />
                            <p className="text-sm">No available riders right now.</p>
                        </div>
                    ) : filteredRiders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-muted-foreground">
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
                                    <li
                                        key={rider.id}
                                        className="flex items-center gap-3 px-6 py-4"
                                    >
                                        {/* Avatar placeholder */}
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                                            {getRiderInitial(rider)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="truncate text-sm font-medium">
                                                {displayName}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                                                {rider.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <PhoneIcon className="size-3" />
                                                        {rider.phone}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <MapPinIcon className="size-3" />
                                                    {formatDistance(rider.distanceKm)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <Badge className="shrink-0 rounded-sm bg-green-500/10 text-green-600 dark:text-green-400 capitalize text-xs hidden sm:inline-flex">
                                            {rider.availability_status}
                                        </Badge>

                                        {/* Assign button */}
                                        <Button
                                            size="sm"
                                            variant={isDone ? "default" : "outline"}
                                            disabled={
                                                isAssigning ||
                                                isDone ||
                                                assigningId !== null
                                            }
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
                        Skip for now
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
