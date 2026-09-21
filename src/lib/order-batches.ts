import type { Customer, Location, Order } from "@/types/logistics"

type RawRecord = Record<string, unknown>

export interface DeliveryPointView {
  id?: string
  index?: number
  customer: Pick<Customer, "name" | "phone">
  customerEmail?: string
  deliveryLocation: Location
  productCategory?: string
  itemDescription?: string
  collectionAmount?: number
  tripPrice?: number
  status: string
  deliveredAt?: string
}

const emptyLocation: Location = {
  address: "Not provided",
  latitude: 0,
  longitude: 0,
}

const emptyCustomer: Pick<Customer, "name" | "phone"> = {
  name: "Not provided",
  phone: "Not provided",
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

function getRecord(value: unknown): RawRecord | undefined {
  return isRecord(value) ? value : undefined
}

function getLocation(value: unknown): Location | undefined {
  const location = getRecord(value)
  if (!location) return undefined

  const address = getString(location.address)
  if (!address) return undefined

  return {
    address,
    latitude: getNumber(location.latitude) ?? 0,
    longitude: getNumber(location.longitude) ?? 0,
  }
}

function getCustomer(value: unknown): Pick<Customer, "name" | "phone"> | undefined {
  const customer = getRecord(value)
  if (!customer) return undefined

  const name = getString(customer.name)
  const phone = getString(customer.phone) ?? getString(customer.phone_number)
  if (!name || !phone) return undefined

  return { name, phone }
}

function getPointArray(order: Order): RawRecord[] {
  const rawOrder = order as unknown as RawRecord
  const keys = [
    "delivery_locations",
    "deliveryLocations",
    "delivery_points",
    "deliveryPoints",
    "orders",
    "batch_orders",
    "batchOrders",
  ]

  for (const key of keys) {
    const value = rawOrder[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }

  return []
}

export function getDeliveryPoints(order: Order): DeliveryPointView[] {
  const rawOrder = order as unknown as RawRecord
  const rawPoints = getPointArray(order)
  const fallbackDeliveryLocation = getLocation(rawOrder.delivery_location) ?? emptyLocation
  const fallbackCustomer = getCustomer(rawOrder.customer) ?? emptyCustomer

  if (rawPoints.length === 0) {
    return [
      {
        id: order.id,
        customer: fallbackCustomer,
        deliveryLocation: fallbackDeliveryLocation,
        itemDescription: order.item_description,
        status: order.status,
        deliveredAt: order.delivered_at,
      },
    ]
  }

  return rawPoints.map((point, index) => {
    const customerDetails = getRecord(point.customer_details)
    const deliveryLocation =
      getLocation(point.delivery) ??
      getLocation(point.delivery_location) ??
      getLocation(point.deliveryLocation) ??
      getLocation(point) ??
      fallbackDeliveryLocation
    const customer =
      getCustomer(point.customer_details) ??
      getCustomer(point.customer) ??
      fallbackCustomer

    return {
      id: getString(point.id) ?? getString(point.order_id) ?? `${order.id}-${index + 1}`,
      index: getNumber(point.index),
      customer,
      customerEmail: getString(customerDetails?.email),
      deliveryLocation,
      productCategory: getString(point.product_category) ?? getString(point.productCategory),
      itemDescription: getString(point.item_description) ?? getString(point.itemDescription),
      collectionAmount: getNumber(point.collection_amount) ?? getNumber(point.collectionAmount),
      tripPrice: getNumber(point.trip_price) ?? getNumber(point.tripPrice),
      status: getString(point.status) ?? order.status,
      deliveredAt: getString(point.delivered_at) ?? getString(point.deliveredAt),
    }
  })
}

export function isBatchOrder(order: Order): boolean {
  return getPointArray(order).length > 1
}

export function getOrderReference(order: Order): string {
  const rawOrder = order as unknown as RawRecord
  const orderId = rawOrder.order_id
  return getString(rawOrder.order_number) ?? getString(orderId) ?? (typeof orderId === "number" ? String(orderId) : undefined) ?? order.id
}

/** ID segment the vendor_admin order routes expect (often numeric order_id). */
export function getOrderApiId(order: Order): string {
  const rawOrder = order as unknown as RawRecord
  const orderId = rawOrder.order_id
  if (orderId != null && orderId !== "") return String(orderId)
  return order.id
}

export function getPickupLocation(order: Order): Location {
  const rawOrder = order as unknown as RawRecord
  return getLocation(rawOrder.pickup_location) ?? getLocation(rawOrder.pickup) ?? emptyLocation
}
