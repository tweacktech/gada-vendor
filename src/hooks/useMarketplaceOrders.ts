import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { useMarketplaceOrderRefresh } from "@/hooks/useMarketplaceOrderRefresh";
import type { MarketplaceOrder } from "@/types/marketplace";

interface UseMarketplaceOrdersOptions {
  page?: number;
  tab?: "pending" | "ongoing" | "completed";
}

export function useMarketplaceOrders({ page = 1, tab }: UseMarketplaceOrdersOptions = {}) {
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getMarketplaceOrders({ page, tab });
      setOrders(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load marketplace orders: ${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load marketplace orders");
      }
      setOrders([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useMarketplaceOrderRefresh(fetchOrders);

  return { orders, total, isLoading, error, refetch: fetchOrders };
}
