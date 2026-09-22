import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { useMarketplaceLiveSync } from "@/hooks/useMarketplaceLiveSync";
import type {
  MarketplaceOrder,
  MarketplaceOrderStatus,
  MarketplaceOrderStatusChangedPayload,
} from "@/types/marketplace";

interface UseMarketplaceOrdersOptions {
  page?: number;
  tab?: "pending" | "ongoing" | "completed";
}

const PENDING_STATUSES = new Set(["pending", "paid"]);
const ONGOING_STATUSES = new Set(["ongoing", "confirmed", "preparing", "on_the_way"]);
const COMPLETED_STATUSES = new Set(["completed", "cancelled"]);

function matchesTab(status: string, tab?: UseMarketplaceOrdersOptions["tab"]) {
  if (!tab) return true;
  if (tab === "pending") return PENDING_STATUSES.has(status);
  if (tab === "ongoing") return ONGOING_STATUSES.has(status);
  return COMPLETED_STATUSES.has(status);
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
  tab?: UseMarketplaceOrdersOptions["tab"]
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
  return next.filter((order) => matchesTab(order.status, tab));
}

export function useMarketplaceOrders({ page = 1, tab }: UseMarketplaceOrdersOptions = {}) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (
    opts?: { silent?: boolean; payload?: MarketplaceOrderStatusChangedPayload }
  ) => {
    if (!opts?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await api.getMarketplaceOrders({ page, tab });
      const next = opts?.payload
        ? applyPayloadToOrders(response.data || [], opts.payload, tab)
        : response.data || [];
      setOrders(next);
      setTotal(response.total || next.length);
      setError(null);
    } catch (err) {
      if (opts?.payload) {
        setOrders((current) => applyPayloadToOrders(current, opts.payload!, tab));
      } else if (!opts?.silent) {
        if (err instanceof ApiError) {
          setError(`Failed to load marketplace orders: ${err.message} (${err.status})`);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load marketplace orders");
        }
        setOrders([]);
        setTotal(0);
      }
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, [page, tab]);

  const applyStatus = useCallback(
    (orderId: string, status: MarketplaceOrderStatus | string) => {
      setOrders((current) =>
        current
          .map((order) =>
            String(order.id) === String(orderId)
              ? { ...order, status: status as MarketplaceOrder["status"] }
              : order
          )
          .filter((order) => matchesTab(order.status, tab))
      );
    },
    [tab]
  );

  const handleRealtime = useCallback(
    (payload?: MarketplaceOrderStatusChangedPayload) => {
      if (payload) {
        setOrders((current) => applyPayloadToOrders(current, payload, tab));
      }
      void fetchOrders({ silent: true, payload });
    },
    [fetchOrders, tab]
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useMarketplaceLiveSync(handleRealtime);

  return { orders, total, isLoading, error, refetch: fetchOrders, applyStatus };
}
