// ─────────────────────────────────────────────
//  Marketplace types
//  Mirrors app/Http/Resources/Marketplace/* on the backend.
// ─────────────────────────────────────────────

export const MarketplaceOrderStatus = {
  PENDING: "pending",
  ONGOING: "ongoing",
  PAID: "paid",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  ON_THE_WAY: "on_the_way",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type MarketplaceOrderStatus =
  (typeof MarketplaceOrderStatus)[keyof typeof MarketplaceOrderStatus];

/** Statuses a vendor admin is allowed to move an order to manually. */
export const EDITABLE_MARKETPLACE_ORDER_STATUSES: MarketplaceOrderStatus[] = [
  "preparing",
  "on_the_way",
  "completed",
  "cancelled",
];

export interface MarketplaceOrderItem {
  id: string;
  marketplace_product_id?: string;
  product_name: string;
  quantity: number;
  is_custom?: boolean;
  status: string;
  unit_price: number | null;
  total_price: number | null;
  expected_price: number | null;
  max_budget: number | null;
  market_price: number | null;
  actual_price: number | null;
  agent_note: string | null;
}

export interface MarketplaceOrderTimelineStep {
  status: string;
  label: string;
  reached_at: string | null;
  completed: boolean;
}

export interface MarketplaceOrderTimeline {
  steps: MarketplaceOrderTimelineStep[];
  other_events: Array<{ label: string; reached_at: string | null; [key: string]: unknown }>;
}

export interface MarketplaceOrderTimelineResponse {
  order_id: number | string;
  order_number: string;
  pin?: string | null;
  current_status: MarketplaceOrderStatus | string;
  steps: MarketplaceOrderTimelineStep[];
  other_events?: Array<{ label: string; reached_at: string | null; [key: string]: unknown }>;
}

export interface MarketplaceOrderCustomer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  current_location: string | null;
  lat: string | null;
  lng: string | null;
}

export interface MarketplaceOrderRider {
  id: number;
  name: string;
  phone: string | null;
  current_location: string | null;
  lat: string | null;
  lng: string | null;
}

export interface MarketplaceOrderAgent {
  id: number;
  full_name?: string;
  name?: string;
  phone: string | null;
  status?: string;
  current_location?: string | null;
  lat?: string | null;
  lng?: string | null;
}

export interface MarketplaceOrder {
  id: string;
  order_number: string;
  status: MarketplaceOrderStatus;
  status_label?: string;
  vendor?: {
    id: string;
    name: string;
    address?: string;
    phone_number?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
    lat?: string | number | null;
    lng?: string | number | null;
  };
  customer?: MarketplaceOrderCustomer;
  rider?: MarketplaceOrderRider | null;
  agent?: MarketplaceOrderAgent | null;
  delivery?: {
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    fee: string | null;
  };
  pricing?: {
    subtotal: string;
    delivery_fee: string;
    market_run_fee: string | null;
    total: string;
  };
  collection?: {
    amount: number | string | null;
    paid: boolean;
  };
  timeline?: MarketplaceOrderTimeline;
  pin?: string | null;
  subtotal?: number;
  delivery_fee?: number;
  total?: number;
  delivery_address?: string | null;
  service_charged?: number;
  items: MarketplaceOrderItem[];
  agent_status?: string | null;
  market_run_fee?: number | null;
  collection_amount?: number | null;
  collection_amount_paid?: boolean;
  notes?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
}

/** A vendor's field agent (market-run shopper), per /vendor_admin/agents. */
export interface MarketplaceAgent {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  vendor_id: string | null;
  status: string;
  trip_status: string | null;
  created_at: string;
  vendor?: {
    id: string;
    business_name: string;
    type: string;
  } | null;
}

export const AGENT_STATUS_FILTERS = [
  "pending_interview",
  "active",
  "rejected",
] as const;

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  products?: MarketplaceProduct[];
}

export interface MarketplaceProduct {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  discount_price: number | null;
  effective_price: number;
  unit: string | null;
  is_available: boolean;
}

export interface CreateMarketplaceProductPayload {
  marketplace_category_id?: string | null;
  name: string;
  description?: string;
  price: number;
  discount_price?: number | null;
  unit?: string;
  stock_quantity?: number;
  is_available?: boolean;
  image?: File | null;
}

export interface CreateMarketplaceCategoryPayload {
  name: string;
  icon?: string;
}

// ─────────────────────────────────────────────
//  Realtime: broadcast event payloads
//  Mirrors the JSON shapes in the Pusher/Laravel WebSockets guide (§7).
//  These arrive over the vendor admin's private channel, not the REST API.
// ─────────────────────────────────────────────

/** Broadcast name: "marketplace-order.status". Fired by MarketplaceOrderStatusChanged. */
export interface MarketplaceOrderStatusChangedPayload {
  marketplace_order_id: number;
  order_number: string;
  status: MarketplaceOrderStatus;
  previous_status: MarketplaceOrderStatus | null;
  agent_status: string | null;
  previous_agent_status: string | null;
  vendor_id: number;
  agent_id: number | null;
  rider_id: number | null;
  updated_at: string;
}
