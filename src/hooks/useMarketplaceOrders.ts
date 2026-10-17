import { useState, useEffect, useCallback } from "react";
import { api, ApiError, type GetMarketplaceOrdersParams } from "@/lib/api";
import { useMarketplaceLiveSync } from "@/hooks/useMarketplaceLiveSync";
import { dateFilterToParams, type DateFilterValue } from "@/lib/dateFilter";
import type {
  MarketplaceOrder,
  MarketplaceOrderStatus,
  MarketplaceOrderStatusChangedPayload,
} from "@/types/marketplace";

export type MarketplaceOrderListStatus = "pending" | "confirmed" | "preparing" | "completed";

interface UseMarketplaceOrdersOptions {
  page?: number;
  statusFilter?: MarketplaceOrderListStatus;
  dateFilter?: DateFilterValue | null;
  minAmount?: string;
  maxAmount?: string;
}

function amountParam(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const PENDING_STATUSES = new Set(["pending", "new", "paid"]);

function matchesStatus(orderStatus: string, filter?: MarketplaceOrderListStatus) {
  if (!filter) return true;
  const normalized = orderStatus.toLowerCase();
  if (filter === "pending") return PENDING_STATUSES.has(normalized);
  return normalized === filter;
}

function sameOrder(order: MarketplaceOrder, payload: MarketplaceOrderStatusChangedPayload) {
  return (
    String(order.id) === String(payload.marketplace_order_id) ||
    (!!payload.order_number && order.order_number === payload.order_number)
  );
}

function applyPayloadToOrders(
  orders: MarketplaceOrder[],
  payload: MarketplaceOrderStatusChangedPayload,
  status?: MarketplaceOrderListStatus
) {
  const exists = orders.some((order) => sameOrder(order, payload));
  const next = exists
    ? orders.map((order) =>
        sameOrder(order, payload)
          ? {
              ...order,
              status: payload.status,
              agent_status: payload.agent_status,
            }
          : order
      )
    : orders;
  return next.filter((order) => matchesStatus(order.status, status));
}

const PAGE_SIZE = 15;

export function useMarketplaceOrders({
  statusFilter,
  dateFilter = null,
  minAmount,
  maxAmount,
}: UseMarketplaceOrdersOptions = {}) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = `${statusFilter ?? ""}|${dateFilter ? JSON.stringify(dateFilter) : "all"}|${minAmount ?? ""}|${maxAmount ?? ""}`;
  const [seenFilters, setSeenFilters] = useState(filtersKey);
  if (seenFilters !== filtersKey) {
    setSeenFilters(filtersKey);
    setPage(1);
  }

  const fetchOrders = useCallback(async (
    opts?: { silent?: boolean; payload?: MarketplaceOrderStatusChangedPayload }
  ) => {
    if (!opts?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const min = amountParam(minAmount);
      const max = amountParam(maxAmount);
      const params: GetMarketplaceOrdersParams = {
        page,
        limit: PAGE_SIZE,
        per_page: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...dateFilterToParams(dateFilter, { all: true }),
        ...(min != null ? { min_amount: min } : {}),
        ...(max != null ? { max_amount: max } : {}),
      };
      const response = await api.getMarketplaceOrders(params);
      const next = opts?.payload
        ? applyPayloadToOrders(response.data || [], opts.payload, statusFilter)
        : response.data || [];
      setOrders(next);
      setTotal(response.total ?? next.length);
      setLastPage(response.lastPage ?? Math.max(1, Math.ceil((response.total || next.length) / PAGE_SIZE)));
      setError(null);
    } catch (err) {
      if (opts?.payload) {
        setOrders((current) => applyPayloadToOrders(current, opts.payload!, statusFilter));
      } else if (!opts?.silent) {
        if (err instanceof ApiError) {
          setError(`Failed to load marketplace orders: ${err.message} (${err.status})`);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load marketplace orders");
        }
        setOrders([]);
        setTotal(0);
        setLastPage(1);
      }
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, [page, statusFilter, dateFilter, minAmount, maxAmount]);

  const applyStatus = useCallback(
    (orderId: string, status: MarketplaceOrderStatus | string) => {
      setOrders((current) =>
        current
          .map((order) =>
            String(order.id) === String(orderId)
              ? { ...order, status: status as MarketplaceOrder["status"] }
              : order
          )
          .filter((order) => matchesStatus(order.status, statusFilter))
      );
    },
    [statusFilter]
  );

  const handleRealtime = useCallback(
    (payload?: MarketplaceOrderStatusChangedPayload) => {
      if (payload) {
        setOrders((current) => applyPayloadToOrders(current, payload, statusFilter));
      }
      void fetchOrders({ silent: true, payload });
    },
    [fetchOrders, statusFilter]
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useMarketplaceLiveSync(handleRealtime);

  return {
    orders,
    total,
    page,
    lastPage,
    limit: PAGE_SIZE,
    isLoading,
    error,
    setPage,
    refetch: fetchOrders,
    applyStatus,
  };
}
