import axios, { AxiosError } from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import type { Order, Rider, Vendor, DashboardMetrics } from "@/types/logistics";
import type {
  MarketplaceOrder,
  MarketplaceCategory,
  MarketplaceProduct,
  MarketplaceAgent,
  CreateMarketplaceProductPayload,
  CreateMarketplaceCategoryPayload,
} from "@/types/marketplace";
import type { VendorNotification } from "@/types/notifications";
import localMenuItems from "@/data/getitems.json";

// ─────────────────────────────────────────────
//  🔀 ITEMS SOURCE FLAG
//  Set to `true`  → use bundled src/data/getitems.json (avoids CORS)
//  Set to `false` → fetch live from tastiaonline.com/api/paypress/getitems
// ─────────────────────────────────────────────
const USE_LOCAL_ITEMS = true;

// ── External menu item shape ─────────────────────────────────────────────────
export interface MenuItem {
  Id: number;
  ProductName: string;
  ProductGroup: string | null;
  Selling: number | null;
  Active: number;
}
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────
//  Shared response envelope
// ─────────────────────────────────────────────

/** Generic wrapper matching a typical { data, message } API envelope. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Paginated list response. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─────────────────────────────────────────────
//  Request param / body types
// ─────────────────────────────────────────────

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  vendor_id: string;
  pickup_location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  delivery_location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  item_description: string;
  amount: number;
}

export interface CreateBulkOrdersPayload {
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  orders: {
    delivery: {
      address: string;
      latitude: number;
      longitude: number;
    };
    customer_details: {
      name: string;
      phone_number: string;
    };
    product_category: string;
    item_description: string;
    amount: number;
  }[];
}

export interface CreateBulkOrdersResult {
  orderId?: string;
  orders: Order[];
}

export interface BatchOrdersResult {
  orderId?: string;
  order?: Order;
}

export interface CreateVendorPayload {
  name: string;
  address: string;
  phone_number: string;
  email: string;
}

export interface GetOrdersParams {
    page?: number;
    limit?: number;
    status?: string;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    filter?: string; // Add this if it exists
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    account_type: string;
    vendor_id?: number;
    tenant_vendor_id?: number;
    is_superadmin?: boolean;
  };
}

export interface ValidateSetPasswordTokenPayload {
  email: string;
  token: string;
}

export interface SetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface GetAvailableRidersParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  availability_status?: string;
}

export interface GetMarketplaceOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  tab?: "pending" | "ongoing" | "completed";
}

export interface GetMarketplaceProductsParams {
  category_id?: string;
}

// ─────────────────────────────────────────────
//  Typed API error
// ─────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Normalises an Axios error into a typed ApiError. */
function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string; code?: string }>;
    const status = axiosErr.response?.status ?? 0;
    const message =
      axiosErr.response?.data?.message ?? axiosErr.message ?? "Unknown error";
    const code = axiosErr.response?.data?.code;

    throw new ApiError(message, status, code);
  }
  throw error;
}

// ─────────────────────────────────────────────
//  Axios client
// ─────────────────────────────────────────────

function createClient(): AxiosInstance {
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  if (!baseURL) {
    console.warn(
      "[api] VITE_API_BASE_URL is not set. Requests will use a relative base."
    );
  }

  const client = axios.create({
    baseURL: baseURL ?? "/api",
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // ── Request interceptor: attach auth token if present ──────────────────────
  client.interceptors.request.use((config) => {
    const token = auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ── Response interceptor: unwrap envelope / handle global errors ───────────
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: unknown) => handleAxiosError(error)
  );

  return client;
}

const client = createClient();

// ─────────────────────────────────────────────
//  🚧 DEMO MODE
//  Set to `false` (or delete the dummy branches) to restore real API calls.
// ─────────────────────────────────────────────

const DEMO_MODE = false;

// ── Dummy seed data ────────────────────────────────────────────────────────

const DUMMY_RIDERS: Rider[] = [
  {
    id: "rider-1",
    name: "Emeka Okafor",
    phone: "+234 803 000 0001",
    availability_status: "available",
    current_location: { latitude: 6.5244, longitude: 3.3792 },
  },
  {
    id: "rider-2",
    name: "Aisha Bello",
    phone: "+234 805 000 0002",
    availability_status: "available",
    current_location: { latitude: 6.5358, longitude: 3.3564 },
  },
  {
    id: "rider-3",
    name: "Chidi Nwachukwu",
    phone: "+234 807 000 0003",
    availability_status: "busy",
    current_location: { latitude: 6.5480, longitude: 3.3900 },
  },
];

const DUMMY_VENDORS: Vendor[] = [
  { id: "vendor-1", name: "Mama Cass Restaurant", address: "14 Allen Ave, Ikeja, Lagos", phone_number: "08012345671", email: "contact@mamacass.example.com" },
  { id: "vendor-2", name: "Chicken Republic – VI", address: "Plot 1234 Adeola Odeku St, Victoria Island", phone_number: "08012345672", email: "vi@chicken-republic.example.com" },
  { id: "vendor-3", name: "Domino's Pizza Lekki", address: "Lekki Phase 1, Lagos", phone_number: "08012345673", email: "lekki@dominos.example.com" },
];

const DUMMY_ORDERS: Order[] = [
  {
    id: "order-001",
    customer: { id: "cust-1", name: "Funke Adeyemi", phone: "+234 901 111 0001" },
    pickup_location: { address: "14 Allen Ave, Ikeja", latitude: 6.6018, longitude: 3.3515 },
    delivery_location: { address: "12 Bode Thomas St, Surulere", latitude: 6.5019, longitude: 3.3587 },
    item_description: "2x Jollof Rice, 1x Grilled Chicken",
    amount: 850000,
    payment_status: "paid",
    status: "in_transit",
    rider: DUMMY_RIDERS[0],
    created_at: "2026-02-23T07:12:00Z",
    updated_at: "2026-02-23T07:45:00Z",
  },
  {
    id: "order-002",
    customer: { id: "cust-2", name: "Tunde Obaseki", phone: "+234 902 111 0002" },
    pickup_location: { address: "Plot 1234 Adeola Odeku St, VI", latitude: 6.4281, longitude: 3.4219 },
    delivery_location: { address: "45 Ozumba Mbadiwe Ave, Lekki", latitude: 6.4480, longitude: 3.4762 },
    item_description: "1x Chicken Burger Combo",
    amount: 320000,
    payment_status: "paid",
    status: "delivered",
    rider: DUMMY_RIDERS[1],
    created_at: "2026-02-23T06:00:00Z",
    updated_at: "2026-02-23T06:50:00Z",
    delivered_at: "2026-02-23T06:50:00Z",
  },
  {
    id: "order-003",
    customer: { id: "cust-3", name: "Ngozi Eze", phone: "+234 903 111 0003" },
    pickup_location: { address: "Lekki Phase 1, Lagos", latitude: 6.4698, longitude: 3.5852 },
    delivery_location: { address: "3 Admiralty Way, Lekki Phase 1", latitude: 6.4710, longitude: 3.5703 },
    item_description: "2x Pepperoni Pizza (Large)",
    amount: 540000,
    payment_status: "pending",
    status: "pending",
    created_at: "2026-02-23T10:05:00Z",
    updated_at: "2026-02-23T10:05:00Z",
  },
  {
    id: "order-004",
    customer: { id: "cust-4", name: "Babajide Fashola", phone: "+234 904 111 0004" },
    pickup_location: { address: "14 Allen Ave, Ikeja", latitude: 6.6018, longitude: 3.3515 },
    delivery_location: { address: "22 Opebi Rd, Ikeja", latitude: 6.5985, longitude: 3.3601 },
    item_description: "3x Fried Rice and Chicken",
    amount: 1200000,
    payment_status: "paid",
    status: "accepted",
    rider: DUMMY_RIDERS[2],
    created_at: "2026-02-23T09:30:00Z",
    updated_at: "2026-02-23T09:45:00Z",
  },
  {
    id: "order-005",
    customer: { id: "cust-5", name: "Amaka Okonkwo", phone: "+234 905 111 0005" },
    pickup_location: { address: "Plot 1234 Adeola Odeku St, VI", latitude: 6.4281, longitude: 3.4219 },
    delivery_location: { address: "10 Glover Rd, Ikoyi", latitude: 6.4550, longitude: 3.4347 },
    item_description: "1x Shawarma Wrap",
    amount: 180000,
    payment_status: "failed",
    status: "cancelled",
    created_at: "2026-02-23T08:00:00Z",
    updated_at: "2026-02-23T08:10:00Z",
  },
];

const DUMMY_METRICS: DashboardMetrics = {
  total_revenue: 48_750_000,   // in kobo → ₦487,500
  active_customers: 1_284,
  total_orders: 3_921,
  conversion_rate: 68.4,
  revenue_change_pct: 12.5,
  customers_change_pct: 8.3,
  orders_change_pct: 15.2,
  conversion_change_pct: -2.1,
};

// ─────────────────────────────────────────────
//  API service
// ─────────────────────────────────────────────

export const api = {
  // ── Auth ───────────────────────────────────

  /** Login with email + password. Stores the returned JWT automatically. */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await client.post<ApiResponse<LoginResponse>>("/vendor_admin/login", {
      email,
      password,
      
    });
    
    // The wrapper provides res.data = { success, message, data: { token, user } }
    const payload = res.data.data;
    auth.setToken(payload.token);
    auth.setCurrentUser(payload.user);
    return payload;
  },

  /** Validate set-password link token from email. */
  async validateSetPasswordToken(data: ValidateSetPasswordTokenPayload): Promise<void> {
    await client.get<ApiResponse<unknown>>("/vendor_admin/validate-set-password-token", {
      params: {
        email: data.email,
        token: data.token,
      },
    });
  },

  /** Set vendor admin password using a one-time email token. */
  async setPassword(data: SetPasswordPayload): Promise<void> {
    await client.post<ApiResponse<unknown>>("/vendor_admin/set-password", data);
  },

  // ── Orders ─────────────────────────────────

  /** Create a new order. */
  async createOrder(data: CreateOrderPayload): Promise<Order> {
    if (DEMO_MODE) {
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        customer: { id: `cust-${Date.now()}`, name: data.customer_name, phone: data.customer_phone },
        pickup_location: data.pickup_location,
        delivery_location: data.delivery_location,
        item_description: data.item_description,
        amount: data.amount,
        payment_status: "pending",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return Promise.resolve(newOrder);
    }
    const res = await client.post<ApiResponse<Order>>("/vendor_admin/orders", data);
    return res.data.data;
  },

  /** Create a batch of orders sharing one pickup location. */
  async createBulkOrders(data: CreateBulkOrdersPayload): Promise<CreateBulkOrdersResult> {
    if (DEMO_MODE) {
      const now = Date.now();
      const orders: Order[] = data.orders.map((entry, index) => ({
        id: `order-${now}-${index + 1}`,
        customer: {
          id: `cust-${now}-${index + 1}`,
          name: entry.customer_details.name,
          phone: entry.customer_details.phone_number,
        },
        pickup_location: data.pickup,
        delivery_location: entry.delivery,
        item_description: entry.item_description,
        amount: entry.amount,
        payment_status: "pending",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      return Promise.resolve({
        orderId: orders[0]?.id,
        orders,
      });
    }

    const res = await client.post<
      | ApiResponse<Order | Order[] | { order?: Order; orders?: Order[]; batch?: Order; created_order?: Order; createdOrder?: Order; order_id?: string | number }>
      | Order
      | Order[]
      | { order?: Order; orders?: Order[]; batch?: Order; created_order?: Order; createdOrder?: Order; order_id?: string | number }
    >("/vendor_admin/orders/bulk", data);
    const responseData = res.data;
    const payload = Array.isArray(responseData)
      ? responseData
      : "data" in responseData
        ? responseData.data
        : responseData;

    if (Array.isArray(payload)) {
      return {
        orderId: payload[0]?.id ? String(payload[0].id) : undefined,
        orders: payload,
      };
    }

    if (payload && "order_id" in payload && payload.order_id) {
      return {
        orderId: String(payload.order_id),
        orders: "orders" in payload && Array.isArray(payload.orders)
          ? payload.orders as Order[]
          : [{ ...(payload as Partial<Order>), id: String(payload.order_id) } as Order],
      };
    }

    if (payload && "order" in payload && payload.order) {
      return { orderId: String(payload.order.id), orders: [payload.order] };
    }
    if (payload && "batch" in payload && payload.batch) {
      return { orderId: String(payload.batch.id), orders: [payload.batch] };
    }
    if (payload && "created_order" in payload && payload.created_order) {
      return { orderId: String(payload.created_order.id), orders: [payload.created_order] };
    }
    if (payload && "createdOrder" in payload && payload.createdOrder) {
      return { orderId: String(payload.createdOrder.id), orders: [payload.createdOrder] };
    }
    if (payload && "orders" in payload && Array.isArray(payload.orders)) {
      const orders = payload.orders;
      return {
        orderId: orders[0]?.id ? String(orders[0].id) : undefined,
        orders,
      };
    }
    if (payload && "id" in payload) {
      const order = payload as Order;
      return { orderId: String(order.id), orders: [order] };
    }
    return { orders: [] };
  },

  /** Fetch a paginated list of orders, optionally filtered. */
  async getOrders(params?: GetOrdersParams): Promise<PaginatedResponse<Order>> {
    if (DEMO_MODE) {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      let orders = [...DUMMY_ORDERS];
      if (params?.status) {
        orders = orders.filter((o) => o.status === params.status);
      }
      if (params?.customer_id) {
        orders = orders.filter((o) => o.customer.id === params.customer_id);
      }
      if (params?.start_date || params?.end_date) {
        const startDate = params.start_date ? new Date(params.start_date) : null;
        const endDate = params.end_date ? new Date(params.end_date) : null;
        orders = orders.filter((o) => {
          const created = new Date(o.created_at);
          if (startDate && created < startDate) return false;
          if (endDate && created > endDate) return false;
          return true;
        });
      }
      const start = (page - 1) * limit;
      return Promise.resolve({
        data: orders.slice(start, start + limit),
        total: orders.length,
        page,
        limit,
      });
    }
    const res = await client.get<PaginatedResponse<Order>>("/vendor_admin/orders", { params });
    return res.data;
  },

  /** Fetch a single order by ID. */
  async getOrder(id: string): Promise<Order> {
    if (DEMO_MODE) {
      const order = DUMMY_ORDERS.find((o) => o.id === id) ?? DUMMY_ORDERS[0];
      return Promise.resolve(order);
    }
    const res = await client.get<ApiResponse<Order>>(`/vendor_admin/orders/${id}`);
    return res.data.data;
  },

  /** Combine two or more existing pending orders into a single batch order. */
  async batchOrders(orderIds: string[]): Promise<BatchOrdersResult> {
    interface BatchPayload {
      order?: BatchPayload;
      batch?: BatchPayload;
      order_id?: string | number;
      id?: string | number;
    }

    const res = await client.post<ApiResponse<BatchPayload> | BatchPayload>(
      "/vendor_admin/orders/batch",
      { order_ids: orderIds }
    );

    const responseData = res.data;
    const payload: BatchPayload =
      responseData && typeof responseData === "object" && "data" in responseData
        ? (responseData.data as BatchPayload)
        : (responseData as BatchPayload);

    // The order detail route is keyed by `order_id` (e.g. 366), not the UUID `id`.
    const node = payload?.order ?? payload?.batch ?? payload;
    const reference = node?.order_id ?? node?.id;

    return reference != null ? { orderId: String(reference) } : {};
  },

  // ── Riders ─────────────────────────────────

  /** Fetch available riders, optionally filtered by proximity to a point. */
  async getAvailableRiders(params?: GetAvailableRidersParams): Promise<Rider[]> {
    if (DEMO_MODE) {
      return Promise.resolve(
        DUMMY_RIDERS.filter((r) => r.availability_status === "available")
      );
    }
    const query: GetAvailableRidersParams = {
      availability_status: params?.availability_status ?? "available",
    };
    if (params?.latitude != null) query.latitude = params.latitude;
    if (params?.longitude != null) query.longitude = params.longitude;
    if (params?.radius != null) query.radius = params.radius;

    const res = await client.get<ApiResponse<Rider[]>>("/vendor_admin/riders", {
      params: query,
    });
    const riders = res.data.data ?? [];
    return riders.map((rider) => ({
      ...rider,
      id: String(rider.id),
    }));
  },

  /** Assign a rider to an existing logistics order. */
  async assignRider(orderId: string, riderId: string): Promise<Order> {
    if (DEMO_MODE) {
      const order = DUMMY_ORDERS.find((o) => o.id === orderId) ?? DUMMY_ORDERS[0];
      const rider = DUMMY_RIDERS.find((r) => r.id === riderId) ?? DUMMY_RIDERS[0];
      return Promise.resolve({
        ...order,
        rider,
        status: "accepted",
        updated_at: new Date().toISOString(),
      });
    }
    const riderPayload = /^\d+$/.test(riderId) ? Number(riderId) : riderId;
    const res = await client.patch<ApiResponse<Order>>(
      `/vendor_admin/orders/${orderId}/assign-rider`,
      { rider_id: riderPayload }
    );
    return res.data.data;
  },

  // ── Vendors ────────────────────────────────

  /** Create a new vendor. */
  async createVendor(data: CreateVendorPayload): Promise<Vendor> {
    if (DEMO_MODE) {
      const newVendor: Vendor = {
        id: `vendor-${Date.now()}`,
        ...data,
      };
      DUMMY_VENDORS.push(newVendor);
      return Promise.resolve(newVendor);
    }
    const res = await client.post<ApiResponse<Vendor>>("/vendor_admin/vendors", data);
    return res.data.data;
  },

  /** Fetch all vendors (restaurants). */
  async getVendors(): Promise<Vendor[]> {
    if (DEMO_MODE) {
      return Promise.resolve(DUMMY_VENDORS);
    }
    const res = await client.get<ApiResponse<Vendor[]>>("/vendor_admin/vendors");
    return res.data.data;
  },

  // ── Menu Items ─────────────────────────────

  /**
   * Fetch the list of available menu items.
   * Source is controlled by the USE_LOCAL_ITEMS flag at the top of this file:
   *   true  → bundled src/data/getitems.json  (CORS-safe)
   *   false → live https://tastiaonline.com/api/paypress/getitems
   */
  async getMenuItems(): Promise<MenuItem[]> {
    if (USE_LOCAL_ITEMS) {
      return localMenuItems as MenuItem[];
    }
    const res = await axios.get<MenuItem[]>(
      "https://tastiaonline.com/api/paypress/getitems"
    );
    return res.data;
  },

  // ── Dashboard ──────────────────────────────

  /** Fetch aggregated dashboard metrics. */
 /** Fetch aggregated dashboard metrics. */
async getDashboardMetrics(params?: {
  filter?: string
  start_date?: string
  end_date?: string
}): Promise<DashboardMetrics> {
  if (DEMO_MODE) {
    return Promise.resolve(DUMMY_METRICS)
  }
  const res = await client.get<ApiResponse<DashboardMetrics>>(
    "/vendor_admin/dashboard/metrics",
    { params }
  )
  return res.data.data
},

  // ── Marketplace: Orders ────────────────────
  // Scoped server-side to the logged-in vendor admin's vendor.

  /** Fetch this vendor's marketplace orders (customer purchases). */
  async getMarketplaceOrders(
    params?: GetMarketplaceOrdersParams
  ): Promise<PaginatedResponse<MarketplaceOrder>> {
    const res = await client.get<ApiResponse<MarketplaceOrder[]> & Partial<PaginatedResponse<MarketplaceOrder>>>(
      "/vendor_admin/marketplace-orders",
      { params }
    );
    const payload = res.data;
    return {
      data: payload.data ?? [],
      total: payload.total ?? payload.data?.length ?? 0,
      page: payload.page ?? params?.page ?? 1,
      limit: payload.limit ?? 20,
    };
  },

  /** Fetch a single marketplace order with items and status history. */
  async getMarketplaceOrder(id: string): Promise<MarketplaceOrder> {
    const res = await client.get<ApiResponse<MarketplaceOrder>>(
      `/vendor_admin/marketplace-orders/${id}`
    );
    return res.data.data;
  },

  /** Move a marketplace order through preparing -> on_the_way -> completed (or cancel it). */
  async updateMarketplaceOrderStatus(id: string, status: string): Promise<MarketplaceOrder> {
    const res = await client.patch<ApiResponse<MarketplaceOrder>>(
      `/vendor_admin/marketplace-orders/${id}/status`,
      { status }
    );
    return res.data.data;
  },

  /** Manually hand a market-run order to a specific field agent at this vendor. */
  async assignAgentToMarketplaceOrder(id: string, agentId: string): Promise<MarketplaceOrder> {
    const res = await client.patch<ApiResponse<MarketplaceOrder>>(
      `/vendor_admin/marketplace-orders/${id}/assign-agent`,
      { agent_id: agentId }
    );
    return res.data.data;
  },

  /** Vendor manually assigns a rider to deliver a marketplace order. */
  async assignRiderToMarketplaceOrder(id: string, riderId: string): Promise<MarketplaceOrder> {
    const orderPayload = /^\d+$/.test(id) ? Number(id) : id;
    const riderPayload = /^\d+$/.test(riderId) ? Number(riderId) : riderId;
    const res = await client.patch<ApiResponse<MarketplaceOrder>>(
      "/vendor_admin/orders/agent-assign-rider",
      { order_id: orderPayload, rider_id: riderPayload }
    );
    return res.data.data;
  },

  /** Assign one rider to multiple marketplace orders. */
  async batchAssignRiderToMarketplaceOrders(orderIds: string[], riderId: string): Promise<void> {
    const orderPayload = orderIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id));
    const riderPayload = /^\d+$/.test(riderId) ? Number(riderId) : riderId;
    await client.patch(
      "/vendor_admin/orders/agent-batch-assign-rider",
      { order_ids: orderPayload, rider_id: riderPayload }
    );
  },

  // ── Notifications (vendor admin inbox) ─────

  async getNotifications(): Promise<VendorNotification[]> {
    const res = await client.get<
      ApiResponse<VendorNotification[]> | VendorNotification[]
    >("/vendor_admin/notifications");
    const payload = res.data;
    if (Array.isArray(payload)) return payload;
    return payload.data ?? [];
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await client.post<ApiResponse<unknown>>(
      `/vendor_admin/mark-as-read/${notificationId}`
    );
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await client.delete<ApiResponse<unknown>>(
      `/vendor_admin/delete-notification/${notificationId}`
    );
  },

  // ── Marketplace: Categories ────────────────

  /** Fetch this vendor's storefront categories (e.g. Drinks, Appetizers). */
  async getMarketplaceCategories(vendorId: string | number): Promise<MarketplaceCategory[]> {
    const res = await client.get<ApiResponse<MarketplaceCategory[]>>(
      `/marketplace/vendors/${vendorId}/categories`
    );
    return res.data.data;
  },

  /** Create a new storefront category for this vendor. */
  async createMarketplaceCategory(
    vendorId: string | number,
    data: CreateMarketplaceCategoryPayload
  ): Promise<MarketplaceCategory> {
    const res = await client.post<ApiResponse<MarketplaceCategory>>(
      `/marketplace/vendors/${vendorId}/categories`,
      data
    );
    return res.data.data;
  },

  /** Rename/update a storefront category. */
  async updateMarketplaceCategory(
    categoryId: string,
    data: CreateMarketplaceCategoryPayload
  ): Promise<MarketplaceCategory> {
    const res = await client.put<ApiResponse<MarketplaceCategory>>(
      `/marketplace/categories/${categoryId}`,
      data
    );
    return res.data.data;
  },

  /** Delete a storefront category. */
  async deleteMarketplaceCategory(categoryId: string): Promise<void> {
    await client.delete<ApiResponse<unknown>>(`/marketplace/categories/${categoryId}`);
  },

  // ── Marketplace: Products ──────────────────

  /** Fetch this vendor's product catalog, optionally filtered by category. */
  async getMarketplaceProducts(
    vendorId: string | number,
    params?: GetMarketplaceProductsParams
  ): Promise<MarketplaceProduct[]> {
    const res = await client.get<ApiResponse<MarketplaceProduct[]>>(
      `/marketplace/vendors/${vendorId}/products`,
      { params }
    );
    return res.data.data;
  },

  /** Add a new product to this vendor's catalog. */
  async createMarketplaceProduct(
    vendorId: string | number,
    data: CreateMarketplaceProductPayload
  ): Promise<MarketplaceProduct> {
    const form = new FormData();
    form.append("name", data.name);
    form.append("price", String(data.price));
    if (data.marketplace_category_id) form.append("marketplace_category_id", data.marketplace_category_id);
    if (data.description) form.append("description", data.description);
    if (data.discount_price != null) form.append("discount_price", String(data.discount_price));
    if (data.unit) form.append("unit", data.unit);
    if (data.stock_quantity != null) form.append("stock_quantity", String(data.stock_quantity));
    if (data.is_available != null) form.append("is_available", data.is_available ? "1" : "0");
    if (data.image) form.append("image", data.image);

    const res = await client.post<ApiResponse<MarketplaceProduct>>(
      `/marketplace/vendors/${vendorId}/products`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data.data;
  },

  /** Update an existing product's details. */
  async updateMarketplaceProduct(
    productId: string,
    data: Partial<CreateMarketplaceProductPayload>
  ): Promise<MarketplaceProduct> {
    const form = new FormData();
    form.append("_method", "PUT");
    if (data.name) form.append("name", data.name);
    if (data.price != null) form.append("price", String(data.price));
    if (data.marketplace_category_id) form.append("marketplace_category_id", data.marketplace_category_id);
    if (data.description) form.append("description", data.description);
    if (data.discount_price != null) form.append("discount_price", String(data.discount_price));
    if (data.unit) form.append("unit", data.unit);
    if (data.stock_quantity != null) form.append("stock_quantity", String(data.stock_quantity));
    if (data.is_available != null) form.append("is_available", data.is_available ? "1" : "0");
    if (data.image) form.append("image", data.image);

    const res = await client.post<ApiResponse<MarketplaceProduct>>(
      `/marketplace/products/${productId}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data.data;
  },

  /** Toggle a product between available / out of stock. */
  async toggleMarketplaceProductAvailability(productId: string): Promise<MarketplaceProduct> {
    const res = await client.patch<ApiResponse<MarketplaceProduct>>(
      `/marketplace/products/${productId}/toggle-availability`
    );
    return res.data.data;
  },

  /** Remove a product from the catalog. */
  async deleteMarketplaceProduct(productId: string): Promise<void> {
    await client.delete<ApiResponse<unknown>>(`/marketplace/products/${productId}`);
  },

  // ── Marketplace: Agents (field/market-run shoppers) ───

  /** List this vendor's field agents, optionally filtered by status (pending_interview | active | rejected). */
  async getMarketplaceAgents(status?: string): Promise<MarketplaceAgent[]> {
    const res = await client.get<ApiResponse<MarketplaceAgent[]>>("/vendor_admin/agents", {
      params: status ? { status } : undefined,
    });
    return res.data.data;
  },

  /** Activate an agent after their in-person interview so they can start collecting orders. */
  async activateMarketplaceAgent(agentId: string): Promise<MarketplaceAgent> {
    const res = await client.post<ApiResponse<MarketplaceAgent>>(
      `/vendor_admin/agents/${agentId}/activate`
    );
    return res.data.data;
  },

  /** Reject a pending agent application. */
  async rejectMarketplaceAgent(agentId: string, reason?: string): Promise<MarketplaceAgent> {
    const res = await client.post<ApiResponse<MarketplaceAgent>>(
      `/vendor_admin/agents/${agentId}/reject`,
      reason ? { reason } : {}
    );
    return res.data.data;
  },

};
