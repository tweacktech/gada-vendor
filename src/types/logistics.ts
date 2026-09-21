// ─────────────────────────────────────────────
//  Enums
// ─────────────────────────────────────────────

export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const DeliveryStatus = {
  PENDING: "pending",           // Order placed, not yet accepted
  ACCEPTED: "accepted",         // Rider accepted the order
  ARRIVED_PICKUP: "arrived_pickup", // Rider arrived at pickup location
  PICKED_UP: "picked_up",       // Rider picked up from vendor
  START_DELIVERY: "start_delivery", // Rider starting delivery
  IN_TRANSIT: "in_transit",     // On the way to customer
  DELIVERED: "delivered",       // Successfully delivered
  CANCELLED: "cancelled",       // Order was cancelled
  FAILED: "failed",             // Delivery attempt failed
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

// ─────────────────────────────────────────────
//  Core Entities
// ─────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  availability_status: "available" | "busy" | "offline";
  current_location: {
    latitude: number;
    longitude: number;
  };
}

export interface Vendor {
  id: string;
  name: string;
  business_name?: string;
  address: string;
  phone_number: string;
  email: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}

// ─────────────────────────────────────────────
//  Order
// ─────────────────────────────────────────────

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Order {
  id: string;
  customer: Customer;
  pickup_location: Location;   // Vendor / restaurant location
  delivery_location: Location; // Customer's delivery address
  item_description: string;
  amount: number;              // Total order amount (in smallest currency unit, e.g. kobo)
  payment_status: PaymentStatus;
  status: DeliveryStatus;
  rider?: Rider;               // Assigned rider (optional until accepted)
  created_at: string;          // ISO 8601 timestamp
  updated_at: string;          // ISO 8601 timestamp
  delivered_at?: string;       // Set when status becomes DELIVERED
}

// ─────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────

export interface DashboardMetrics {
  /** Total revenue in the smallest currency unit (e.g. kobo) */
  total_revenue: number;
  active_customers: number;
  total_orders: number;
  /** Conversion rate as a percentage, e.g. 12.5 means 12.5% */
  conversion_rate: number;
  revenue_change_pct: number;
  customers_change_pct: number;
  orders_change_pct: number;
  conversion_change_pct: number;
}
