import type {
  MarketplaceOrder,
  MarketplaceOrderAgent,
  MarketplaceOrderCustomer,
  MarketplaceOrderRider,
} from "@/types/marketplace"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function firstRecord(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const record = asRecord(source[key])
    if (record) return record
  }
  return null
}

function personName(person: Record<string, unknown> | null): string | null {
  if (!person) return null
  const combinedName = [asText(person.first_name), asText(person.last_name)]
    .filter(Boolean)
    .join(" ")
  return (
    asText(person.full_name) ??
    asText(person.name) ??
    asText(person.business_name) ??
    (combinedName || null)
  )
}

function personPhone(person: Record<string, unknown> | null): string | null {
  if (!person) return null
  return asText(person.phone) ?? asText(person.phone_number) ?? asText(person.mobile)
}

export function normalizeMarketplaceCustomer(
  raw: Record<string, unknown>
): MarketplaceOrderCustomer | undefined {
  const person =
    firstRecord(raw, ["customer", "user", "buyer", "customer_details"]) ??
    (asText(raw.customer_name) || asText(raw.customer_phone) ? raw : null)
  if (!person) return undefined

  const name = personName(person) ?? asText(raw.customer_name)
  if (!name && !personPhone(person) && !asText(raw.customer_phone)) return undefined

  return {
    id: Number(person.id ?? 0),
    full_name: name ?? "Customer",
    phone: personPhone(person) ?? asText(raw.customer_phone) ?? "",
    email: asText(person.email),
    current_location: asText(person.current_location) ?? asText(person.address),
    lat: asText(person.lat) ?? asText(person.latitude),
    lng: asText(person.lng) ?? asText(person.longitude),
  }
}

export function normalizeMarketplaceRider(
  raw: Record<string, unknown>
): MarketplaceOrderRider | null {
  const person =
    firstRecord(raw, ["rider", "assigned_rider", "delivery_rider"]) ??
    firstRecord(asRecord(raw.delivery) ?? {}, ["rider", "assigned_rider"])
  if (!person && raw.rider_id == null) return null
  if (!person) {
    const name = asText(raw.rider_name)
    if (!name && raw.rider_id == null) return null
    return {
      id: Number(raw.rider_id ?? 0),
      name: name ?? "Assigned rider",
      phone: asText(raw.rider_phone),
      current_location: null,
      lat: null,
      lng: null,
    }
  }

  return {
    id: Number(person.id ?? raw.rider_id ?? 0),
    name: personName(person) ?? asText(raw.rider_name) ?? "Assigned rider",
    phone: personPhone(person) ?? asText(raw.rider_phone),
    current_location: asText(person.current_location) ?? asText(person.address),
    lat: asText(person.lat) ?? asText(person.latitude),
    lng: asText(person.lng) ?? asText(person.longitude),
  }
}

export function normalizeMarketplaceAgent(
  raw: Record<string, unknown>
): MarketplaceOrderAgent | null {
  const person = firstRecord(raw, [
    "agent",
    "assigned_agent",
    "field_agent",
    "market_agent",
    "marketplace_agent",
  ])
  if (!person && raw.agent_id == null) return null
  if (!person) {
    const name = asText(raw.agent_name)
    if (!name && raw.agent_id == null) return null
    return {
      id: Number(raw.agent_id ?? 0),
      full_name: name ?? "Assigned agent",
      name: name ?? "Assigned agent",
      phone: asText(raw.agent_phone),
      status: asText(raw.agent_status) ?? undefined,
    }
  }

  const name = personName(person) ?? asText(raw.agent_name) ?? "Assigned agent"
  return {
    id: Number(person.id ?? raw.agent_id ?? 0),
    full_name: name,
    name,
    phone: personPhone(person) ?? asText(raw.agent_phone),
    status: asText(person.status) ?? asText(raw.agent_status) ?? undefined,
    current_location: asText(person.current_location) ?? asText(person.address),
    lat: asText(person.lat) ?? asText(person.latitude),
    lng: asText(person.lng) ?? asText(person.longitude),
  }
}

export function normalizeMarketplaceOrder(raw: unknown): MarketplaceOrder {
  const source = asRecord(raw) ?? {}
  const customer = normalizeMarketplaceCustomer(source)
  const rider = normalizeMarketplaceRider(source)
  const agent = normalizeMarketplaceAgent(source)
  const vendor = asRecord(source.vendor)

  return {
    ...(source as unknown as MarketplaceOrder),
    id: String(source.id ?? source.marketplace_order_id ?? ""),
    order_number: asText(source.order_number) ?? "",
    status: (asText(source.status) ?? "pending") as MarketplaceOrder["status"],
    customer,
    rider,
    agent,
    vendor: vendor
      ? {
          id: String(vendor.id ?? ""),
          name: asText(vendor.name) ?? asText(vendor.business_name) ?? "",
          address: asText(vendor.address) ?? undefined,
          phone_number: asText(vendor.phone_number) ?? asText(vendor.phone) ?? undefined,
          latitude: vendor.latitude as string | number | null | undefined,
          longitude: vendor.longitude as string | number | null | undefined,
          lat: vendor.lat as string | number | null | undefined,
          lng: vendor.lng as string | number | null | undefined,
        }
      : undefined,
    items: Array.isArray(source.items) ? (source.items as MarketplaceOrder["items"]) : [],
    created_at: asText(source.created_at) ?? new Date().toISOString(),
  }
}
