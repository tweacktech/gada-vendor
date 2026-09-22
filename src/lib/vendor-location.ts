import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GetAvailableRidersParams } from "@/lib/api";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const DEFAULT_RADIUS_KM = 10;

export function getDefaultRiderSearchRadius(): number {
  const raw = import.meta.env.VITE_RIDER_SEARCH_RADIUS_KM;
  if (raw != null && raw !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_RADIUS_KM;
}

function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractGeoPoint(source: Record<string, unknown>): GeoPoint | null {
  const latitude =
    parseCoord(source.latitude) ??
    parseCoord(source.lat) ??
    parseCoord(source.vendor_latitude);
  const longitude =
    parseCoord(source.longitude) ??
    parseCoord(source.lng) ??
    parseCoord(source.vendor_longitude);

  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

/** Resolve the logged-in vendor admin's storefront coordinates. */
export async function getVendorLocationForCurrentUser(): Promise<GeoPoint | null> {
  const user = auth.getCurrentUser();
  if (!user) return null;

  const fromUser = extractGeoPoint(user as unknown as Record<string, unknown>);
  if (fromUser) return fromUser;

  try {
    const settings = await api.getVendorSettings();
    if (settings.vendor) {
      return extractGeoPoint(settings.vendor as unknown as Record<string, unknown>);
    }
  } catch {
    // Settings unavailable — caller may pass a fallback (pickup / delivery).
  }

  return null;
}

/** Query params for GET /vendor_admin/riders (nearby available riders). */
export async function buildNearbyRidersParams(
  fallback?: GeoPoint | null
): Promise<GetAvailableRidersParams | undefined> {
  const vendorLocation = await getVendorLocationForCurrentUser();
  const point = vendorLocation ?? fallback ?? null;
  if (!point) return undefined;

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    radius: getDefaultRiderSearchRadius(),
    availability_status: "available",
  };
}
