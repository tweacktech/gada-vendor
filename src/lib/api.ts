import axios, { AxiosError } from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import type { Order, Rider, Vendor, DashboardMetrics } from "@/types/logistics";
import type {
  MarketplaceOrder,
  MarketplaceOrderTimelineResponse,
  MarketplaceOrderTimelineStep,
  MarketplaceCategory,
  MarketplaceProduct,
  MarketplaceAgent,
  CreateMarketplaceProductPayload,
  CreateMarketplaceCategoryPayload,
} from "@/types/marketplace";
import type { VendorNotification } from "@/types/notifications";
import { normalizeMarketplaceOrder } from "@/lib/marketplace-order";
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

export interface VendorSettingsResponse {
  account: {
    full_name: string;
    email: string;
    phone_number: string | null;
  };
  vendor: {
    id?: string | number;
    business_name: string;
    business_email: string;
    business_phone: string;
    address: string;
    latitude: number | string | null;
    longitude: number | string | null;
  };
  events: {
    unread_count: number;
    recent: unknown[];
    broadcast?: {
      channel: string;
      event: string;
    };
  };
}

export interface UpdateVendorAccountPayload {
  full_name: string;
  email: string;
  phone_number: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
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

export interface ChangePasswordPayload {
  old_password: string;
  password: string;
  password_confirmation: string;
}

export const VENDOR_REGISTRATION_TYPES = ["restaurant", "pharmacy", "local_market"] as const;

export type VendorRegistrationType = (typeof VENDOR_REGISTRATION_TYPES)[number];

export interface RegisterVendorPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  business_name: string;
  type: VendorRegistrationType;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface ForgetPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

export interface VendorWallet {
  balance: number;
  currency: string;
  /** Null when the API does not say whether this admin may withdraw. */
  canWithdraw: boolean | null;
  fee: number | null;
  reason: string | null;
}

export interface VendorTransaction {
  id: string;
  type: "credit" | "debit" | string;
  amount: number;
  description: string;
  status: string;
  createdAt: string | null;
  reference: string;
}

export interface VendorBank {
  code: string;
  name: string;
}

export interface BankAccountLookup {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}

export interface SaveBankBeneficiaryPayload {
  account_number: string;
  account_name: string;
  bank_code: string;
  bank_name: string;
}

export interface BankBeneficiary {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

export interface WithdrawPayload {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  senderName: string;
  bankName: string;
  pin: string;
}

export interface VendorWithdrawal {
  id: string;
  amount: number;
  status: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  createdAt: string | null;
  reference: string;
}

export interface PagedResult<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
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

function messageFromApiBody(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const body = data as {
    message?: unknown;
    code?: unknown;
    errors?: Record<string, unknown>;
  };

  if (body.errors && typeof body.errors === "object") {
    const messages = Object.values(body.errors).flatMap((value) => {
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === "string" && item.length > 0);
      }
      return typeof value === "string" && value.length > 0 ? [value] : [];
    });
    if (messages.length > 0) return messages.join(" ");
  }

  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

/** Normalises an Axios error into a typed ApiError. */
function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string; code?: string; errors?: Record<string, unknown> }>;
    const status = axiosErr.response?.status ?? 0;
    const message = messageFromApiBody(
      axiosErr.response?.data,
      axiosErr.message || "Unknown error"
    );
    const code =
      axiosErr.response?.data && typeof axiosErr.response.data.code === "string"
        ? axiosErr.response.data.code
        : undefined;

    throw new ApiError(message, status, code);
  }
  throw error;
}

function unwrapVendorList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && "data" in data) {
      const nested = (data as { data: unknown }).data;
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

function normalizeVendor(raw: Record<string, unknown>): Vendor {
  return {
    id: String(raw.id ?? raw.vendor_id ?? ""),
    name: String(raw.name ?? raw.business_name ?? ""),
    business_name: raw.business_name != null ? String(raw.business_name) : undefined,
    email: String(raw.email ?? raw.business_email ?? ""),
    phone_number: String(raw.phone_number ?? raw.business_phone ?? ""),
    address: String(raw.address ?? ""),
    latitude: (raw.latitude as number | string | null | undefined) ?? null,
    longitude: (raw.longitude as number | string | null | undefined) ?? null,
    lat: (raw.lat as number | string | null | undefined) ?? null,
    lng: (raw.lng as number | string | null | undefined) ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/,/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function optionalBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function unwrapRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  const root = isRecord(payload) ? payload : {};
  if (Array.isArray(root.data)) return root.data.filter(isRecord);
  const nested = isRecord(root.data) ? root.data : null;
  if (nested && Array.isArray(nested.data)) return nested.data.filter(isRecord);
  if (nested && Array.isArray(nested.banks)) return nested.banks.filter(isRecord);
  if (nested && Array.isArray(nested.beneficiaries)) return nested.beneficiaries.filter(isRecord);
  return [];
}

const LIST_KEYS = ["transactions", "withdrawals", "data", "banks", "beneficiaries", "earning_accounts", "accounts"] as const;

function rowsFrom(source: Record<string, unknown>): Record<string, unknown>[] | null {
  for (const key of LIST_KEYS) {
    if (Array.isArray(source[key])) return source[key].filter(isRecord);
  }
  return null;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.data)) return value.data.filter(isRecord);
  return null;
}

function looksLikeTransaction(row: Record<string, unknown>): boolean {
  return (
    "transaction_type" in row ||
    "transaction_title" in row ||
    "transaction_status" in row ||
    "transaction_id" in row ||
    "date_of_transaction" in row
  );
}

function metaFrom(layer: Record<string, unknown>, fallback: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(layer.meta)) return layer.meta;
  if (isRecord(layer.transactions) && isRecord((layer.transactions as { meta?: unknown }).meta)) {
    return (layer.transactions as { meta: Record<string, unknown> }).meta;
  }
  if (isRecord(fallback.meta)) return fallback.meta;
  return layer;
}

/** Earnings history is `{ transactions, meta }`, sometimes nested under `data`. */
function transactionRows(payload: unknown): {
  rows: Record<string, unknown>[];
  meta: Record<string, unknown>;
} {
  const root = isRecord(payload) ? payload : {};
  const found = findTransactionList(root, root, 0);
  if (found) return found;
  const page = unwrapListPage(payload);
  return { rows: page.rows, meta: { current_page: page.page, per_page: page.perPage, total: page.total, last_page: page.lastPage } };
}

function findTransactionList(
  value: unknown,
  root: Record<string, unknown>,
  depth: number
): { rows: Record<string, unknown>[]; meta: Record<string, unknown> } | null {
  if (depth > 5 || !isRecord(value)) return null;

  const named = arrayOfRecords(value.transactions);
  if (named && named.length > 0) {
    return { rows: named, meta: metaFrom(value, root) };
  }

  const direct = arrayOfRecords(value.data);
  if (direct && direct.some(looksLikeTransaction)) {
    return { rows: direct.filter(looksLikeTransaction), meta: metaFrom(value, root) };
  }

  for (const child of Object.values(value)) {
    if (!isRecord(child)) continue;
    const nested = findTransactionList(child, root, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function unwrapListPage(payload: unknown): {
  rows: Record<string, unknown>[];
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
} {
  const root = isRecord(payload) ? payload : {};
  const nested = isRecord(root.data) ? root.data : null;
  const container = nested && rowsFrom(nested) ? nested : root;
  const rows = rowsFrom(container) ?? unwrapRows(payload);
  const meta = isRecord(container.meta)
    ? container.meta
    : isRecord(root.meta)
      ? root.meta
      : container;
  const perPage = firstNumber(meta.per_page, meta.limit, container.per_page) || 15;
  const total = firstNumber(meta.total, container.total, rows.length);
  const lastPage = Math.max(1, firstNumber(meta.last_page, container.last_page) || Math.ceil(total / perPage) || 1);
  return {
    rows,
    page: firstNumber(meta.current_page, meta.page, container.current_page) || 1,
    perPage,
    total,
    lastPage,
  };
}

function normalizeWallet(payload: unknown): VendorWallet {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : root;
  const feeRaw = data.fee ?? data.bank_fee ?? data.withdrawal_fee;
  return {
    balance: firstNumber(
      data.balance,
      data.earnings,
      data.earnings_balance,
      data.available_balance,
      data.wallet_balance
    ),
    currency: firstText(data.currency) || "NGN",
    canWithdraw: optionalBool(data.can_withdraw),
    fee: feeRaw == null || feeRaw === "" ? null : firstNumber(feeRaw),
    reason: firstText(data.reason, data.withdraw_message) || null,
  };
}

function normalizeTransaction(row: Record<string, unknown>, index: number): VendorTransaction {
  let amount = firstNumber(row.amount, row.value);
  const rawType = firstText(row.type, row.transaction_type, row.entry_type).toLowerCase();
  let type: VendorTransaction["type"] = rawType || "credit";
  if (rawType.includes("debit") || rawType === "dr") type = "debit";
  else if (rawType.includes("credit") || rawType === "cr") type = "credit";
  if (amount < 0) {
    type = "debit";
    amount = Math.abs(amount);
  }
  return {
    id: firstText(row.id, row.transaction_id) || `transaction-${index}`,
    type,
    amount,
    description: firstText(row.transaction_title, row.description, row.narration, row.remark, row.title) || "Transaction",
    status: firstText(row.transaction_status, row.status) || "",
    createdAt: firstText(row.date_of_transaction, row.created_at, row.date) || null,
    reference: firstText(row.transaction_ref, row.transaction_id, row.reference, row.reference_id),
  };
}

function normalizeBank(row: Record<string, unknown>): VendorBank | null {
  const code = firstText(row.code, row.bank_code, row.bankCode);
  const name = firstText(row.name, row.bank_name, row.bankName);
  if (!code || !name) return null;
  return { code, name };
}

function normalizeBeneficiary(row: Record<string, unknown>, index: number): BankBeneficiary | null {
  const accountNumber = firstText(row.account_number, row.accountNumber);
  const bankCode = firstText(row.bank_code, row.bankCode);
  const accountName = firstText(row.account_name, row.accountName);
  if (!accountNumber || !bankCode || !accountName) return null;
  return {
    id: firstText(row.id) || `${bankCode}-${accountNumber}-${index}`,
    accountName,
    accountNumber,
    bankCode,
    bankName: firstText(row.bank_name, row.bankName),
  };
}

function normalizeWithdrawal(row: Record<string, unknown>, index: number): VendorWithdrawal {
  return {
    id: firstText(row.id, row.reference) || `withdrawal-${index}`,
    amount: Math.abs(firstNumber(row.amount)),
    status: firstText(row.status) || "pending",
    accountName: firstText(row.account_name, row.accountName),
    accountNumber: firstText(row.account_number, row.accountNumber),
    bankName: firstText(row.bank_name, row.bankName),
    createdAt: firstText(row.created_at, row.date) || null,
    reference: firstText(row.reference),
  };
}

function currentVendorIdFromAuth(): string | number | null {
  const user = auth.getCurrentUser();
  return user?.vendor_id ?? user?.tenant_vendor_id ?? null;
}

function isTimelineStep(value: unknown): value is MarketplaceOrderTimelineStep {
  if (!value || typeof value !== "object") return false;
  const step = value as Record<string, unknown>;
  return typeof step.status === "string" || typeof step.label === "string";
}

function normalizeMarketplaceTimeline(
  fallbackId: string,
  payload: Record<string, unknown>
): MarketplaceOrderTimelineResponse {
  const nested =
    payload.timeline && typeof payload.timeline === "object"
      ? (payload.timeline as Record<string, unknown>)
      : payload;

  let steps: MarketplaceOrderTimelineStep[] = [];
  if (Array.isArray(nested.steps)) {
    steps = nested.steps.filter(isTimelineStep).map((step) => ({
      status: String(step.status ?? ""),
      label: String(step.label ?? step.status ?? ""),
      reached_at: step.reached_at != null ? String(step.reached_at) : null,
      completed: Boolean(step.completed),
    }));
  } else if (Array.isArray(payload.steps)) {
    steps = payload.steps.filter(isTimelineStep).map((step) => ({
      status: String(step.status ?? ""),
      label: String(step.label ?? step.status ?? ""),
      reached_at: step.reached_at != null ? String(step.reached_at) : null,
      completed: Boolean(step.completed),
    }));
  }

  const otherEvents = Array.isArray(nested.other_events)
    ? nested.other_events
    : Array.isArray(payload.other_events)
      ? payload.other_events
      : [];

  return {
    order_id: (payload.order_id as number | string | undefined) ?? fallbackId,
    order_number: String(payload.order_number ?? ""),
    pin: payload.pin != null ? String(payload.pin) : null,
    current_status: String(payload.current_status ?? payload.status ?? ""),
    steps,
    other_events: otherEvents as MarketplaceOrderTimelineResponse["other_events"],
  };
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
  async login(email: string, password: string, remember = true): Promise<LoginResponse> {
    const res = await client.post<ApiResponse<LoginResponse>>("/vendor_admin/login", {
      email,
      password,
    });

    // The wrapper provides res.data = { success, message, data: { token, user } }
    const payload = res.data.data;
    auth.setToken(payload.token, remember);
    auth.setCurrentUser(payload.user, remember);
    auth.setRememberedEmail(remember ? email : null);
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

  /** Change the signed-in vendor admin password. */
  async changePassword(data: ChangePasswordPayload): Promise<void> {
    await client.post<ApiResponse<unknown>>("/vendor_admin/change-password", data);
  },

  /** Register a vendor account. It stays pending until an admin approves it. */
  async registerVendor(data: RegisterVendorPayload): Promise<string> {
    const res = await client.post<ApiResponse<unknown>>("/vendor_admin/register", data);
    return res.data.message ?? "Your account is waiting for admin approval.";
  },

  /** Send a password-reset code by SMS and email. */
  async forgetPassword(data: ForgetPasswordPayload): Promise<string> {
    const res = await client.post<ApiResponse<unknown>>("/vendor_admin/forget-password", data);
    return res.data.message ?? "A code was sent by SMS and email.";
  },

  /** Set a new password using the emailed or texted code. */
  async resetPassword(data: ResetPasswordPayload): Promise<string> {
    const res = await client.post<ApiResponse<unknown>>("/vendor_admin/reset-password", data);
    return res.data.message ?? "Password updated.";
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

  /** Fetch account, vendor profile, and notification settings. */
  async getVendorSettings(): Promise<VendorSettingsResponse> {
    const res = await client.get<
      ApiResponse<VendorSettingsResponse> | VendorSettingsResponse
    >("/vendor_admin/settings");
    return "data" in res.data ? res.data.data : res.data;
  },

  /** Update the logged-in vendor administrator and vendor business details. */
  async updateVendorAccount(
    data: UpdateVendorAccountPayload
  ): Promise<void> {
    await client.patch(
      "/vendor_admin/account",
      data
    );
  },

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

  /** Fetch vendors belonging to this admin (`GET /vendor_admin/vendors/{vendor}/children`). */
  async getVendorChildren(vendorId: string | number): Promise<Vendor[]> {
    const res = await client.get<unknown>(
      `/vendor_admin/vendors/${vendorId}/children`
    );
    return unwrapVendorList(res.data).map(normalizeVendor);
  },

  /** Fetch vendors under the logged-in admin's vendor. */
  async getVendors(): Promise<Vendor[]> {
    if (DEMO_MODE) {
      return Promise.resolve(DUMMY_VENDORS);
    }
    let vendorId = currentVendorIdFromAuth();
    if (vendorId == null) {
      const settings = await this.getVendorSettings();
      vendorId = settings.vendor?.id ?? null;
    }
    if (vendorId == null) {
      throw new ApiError("No vendor is linked to this account", 400);
    }
    return this.getVendorChildren(vendorId);
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
    const rows = Array.isArray(payload.data) ? payload.data : [];
    return {
      data: rows.map((order) => normalizeMarketplaceOrder(order)),
      total: payload.total ?? rows.length,
      page: payload.page ?? params?.page ?? 1,
      limit: payload.limit ?? 20,
    };
  },

  /** Fetch a single marketplace order with items and status history. */
  async getMarketplaceOrder(id: string): Promise<MarketplaceOrder> {
    const res = await client.get<ApiResponse<MarketplaceOrder> | MarketplaceOrder>(
      `/vendor_admin/marketplace-orders/${id}`
    );
    const payload = res.data;
    const order =
      payload && typeof payload === "object" && "data" in payload
        ? payload.data
        : payload;
    return normalizeMarketplaceOrder(order);
  },

  /** Fetch marketplace order timeline, PIN, and current status. */
  async getMarketplaceOrderTimeline(id: string): Promise<MarketplaceOrderTimelineResponse> {
    const res = await client.get<
      ApiResponse<Record<string, unknown>> | Record<string, unknown>
    >(`/marketplace/orders/${id}/timeline`);
    const payload =
      res.data && typeof res.data === "object" && "data" in res.data
        ? ((res.data as ApiResponse<Record<string, unknown>>).data ?? {})
        : (res.data as Record<string, unknown>);
    return normalizeMarketplaceTimeline(id, payload);
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

  /** Vendor assigns a rider to one marketplace order. */
  async assignRiderToMarketplaceOrder(id: string, riderId: string): Promise<MarketplaceOrder> {
    const orderPayload = /^\d+$/.test(id) ? Number(id) : id;
    const riderPayload = /^\d+$/.test(riderId) ? Number(riderId) : riderId;
    const res = await client.patch<ApiResponse<MarketplaceOrder>>(
      "/marketplace/orders/assign-rider",
      {
        order_id: orderPayload,
        marketplace_order_id: orderPayload,
        rider_id: riderPayload,
      }
    );
    return res.data.data;
  },

  /** Vendor assigns one rider to multiple marketplace orders. */
  async batchAssignRiderToMarketplaceOrders(orderIds: string[], riderId: string): Promise<void> {
    const orderPayload = orderIds.map((id) => (/^\d+$/.test(id) ? Number(id) : id));
    const riderPayload = /^\d+$/.test(riderId) ? Number(riderId) : riderId;
    await client.patch(
      "/marketplace/orders/batch-assign-rider",
      { order_ids: orderPayload, rider_id: riderPayload }
    );
  },

  // ── Notifications (vendor admin inbox) ─────

  async getNotifications(): Promise<VendorNotification[]> {
    const res = await client.get<unknown>("/vendor_admin/notifications");
    const payload = res.data as
      | VendorNotification[]
      | { data?: VendorNotification[] | { data?: VendorNotification[] } };

    if (Array.isArray(payload)) return payload;
    const inner = payload?.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object" && Array.isArray(inner.data)) {
      return inner.data;
    }
    return [];
  },

  async getNotificationUnreadCount(): Promise<number> {
    const res = await client.get<unknown>("/vendor_admin/notifications/unread-count");
    const payload = res.data as {
      unread_count?: number;
      count?: number;
      data?: number | { unread_count?: number; count?: number };
    };

    if (typeof payload === "number") return payload;
    if (typeof payload?.unread_count === "number") return payload.unread_count;
    if (typeof payload?.count === "number") return payload.count;
    if (typeof payload?.data === "number") return payload.data;
    if (typeof payload?.data?.unread_count === "number") return payload.data.unread_count;
    if (typeof payload?.data?.count === "number") return payload.data.count;
    return 0;
  },

  async markAllNotificationsAsRead(): Promise<void> {
    await client.post<ApiResponse<unknown>>(
      "/vendor_admin/notifications/read-all"
    );
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

  // ── Earnings wallet ────────────────────────

  /** Earnings balance for the signed-in vendor admin. */
  async getWallet(): Promise<VendorWallet> {
    const res = await client.get<unknown>("/vendor_admin/wallet");
    return normalizeWallet(res.data);
  },

  /** This admin's wallet credits and debits. */
  async getTransactions(params: {
    page?: number;
    per_page?: number;
    type?: "credit" | "debit";
  }): Promise<PagedResult<VendorTransaction>> {
    const res = await client.get<unknown>("/vendor_admin/transactions", { params });
    const { rows, meta } = transactionRows(res.data);
    const perPage = firstNumber(meta.per_page, meta.limit) || 15;
    const total = firstNumber(meta.total, rows.length);
    const lastPage = Math.max(1, firstNumber(meta.last_page) || Math.ceil(total / perPage) || 1);
    return {
      data: rows.map(normalizeTransaction),
      page: firstNumber(meta.current_page, meta.page) || 1,
      perPage,
      total,
      lastPage,
    };
  },

  /** Banks available for a payout. */
  async getBanks(): Promise<VendorBank[]> {
    const res = await client.get<unknown>("/vendor_admin/banks");
    return unwrapRows(res.data).map(normalizeBank).filter((bank): bank is VendorBank => bank != null);
  },

  /** Resolve an account name for a bank and account number. */
  async lookupBankAccount(accountNumber: string, bankCode: string): Promise<BankAccountLookup> {
    const res = await client.get<unknown>("/vendor_admin/banks/lookup", {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
    });
    const root = isRecord(res.data) ? res.data : {};
    const data = isRecord(root.data) ? root.data : root;
    const accountName = firstText(data.account_name, data.accountName, data.name);
    if (!accountName) {
      throw new ApiError("Could not find that account", 422);
    }
    return {
      accountName,
      accountNumber: firstText(data.account_number, data.accountNumber) || accountNumber,
      bankCode: firstText(data.bank_code, data.bankCode) || bankCode,
    };
  },

  /** Save a bank account for later withdrawals. */
  async saveBankBeneficiary(data: SaveBankBeneficiaryPayload): Promise<void> {
    await client.post<ApiResponse<unknown>>("/vendor_admin/banks", data);
  },

  /** Saved payout accounts. */
  async getBankBeneficiaries(): Promise<BankBeneficiary[]> {
    const res = await client.get<unknown>("/vendor_admin/banks/beneficiaries");
    return unwrapRows(res.data)
      .map(normalizeBeneficiary)
      .filter((account): account is BankBeneficiary => account != null);
  },

  /** Send earnings to a bank. Store admin only. */
  async withdraw(data: WithdrawPayload): Promise<string> {
    const res = await client.post<ApiResponse<unknown>>("/vendor_admin/withdraw", data);
    return res.data.message ?? "Withdrawal submitted.";
  },

  /** Past withdrawals for the store admin. */
  async getWithdrawals(params?: {
    page?: number;
    per_page?: number;
  }): Promise<PagedResult<VendorWithdrawal>> {
    const res = await client.get<unknown>("/vendor_admin/withdrawals", { params });
    const page = unwrapListPage(res.data);
    return {
      ...page,
      data: page.rows.map(normalizeWithdrawal),
    };
  },

};
