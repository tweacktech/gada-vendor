/**
 * Haversine distance between two lat/lng points.
 * Returns distance in kilometres.
 */
export function haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371 // Earth radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180
}

/**
 * Given a list of riders and a pickup location, returns the riders sorted
 * from nearest to farthest (ascending distance).
 * Attaches a `distanceKm` property for display purposes.
 */
export function sortRidersByDistance<
    T extends {
        current_location?: {
            latitude?: number | null
            longitude?: number | null
        } | null
    }
>(
    riders: T[],
    pickupLat: number,
    pickupLng: number
): (T & { distanceKm: number })[] {
    return riders
        .map((rider) => {
            const latitude = rider.current_location?.latitude
            const longitude = rider.current_location?.longitude
            const hasLocation =
                typeof latitude === "number" &&
                Number.isFinite(latitude) &&
                typeof longitude === "number" &&
                Number.isFinite(longitude)

            return {
                ...rider,
                distanceKm: hasLocation
                    ? haversineKm(pickupLat, pickupLng, latitude, longitude)
                    : Number.POSITIVE_INFINITY,
            }
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
}
