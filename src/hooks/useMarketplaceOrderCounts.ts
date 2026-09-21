import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useMarketplaceOrderRefresh } from "@/hooks/useMarketplaceOrderRefresh";
import type { MarketplaceOrder } from "@/types/marketplace";

export interface MarketplaceOrderCounts {
  newOrders: number;
  confirmed: number;
  preparing: number;
  completed: number;
}

const EMPTY: MarketplaceOrderCounts = {
  newOrders: 0,
  confirmed: 0,
  preparing: 0,
  completed: 0,
};

function countByStatus(orders: MarketplaceOrder[]): MarketplaceOrderCounts {
  return orders.reduce(
    (acc, order) => {
      switch (order.status) {
        case "pending":
        case "paid":
          acc.newOrders += 1;
          break;
        case "confirmed":
          acc.confirmed += 1;
          break;
        case "preparing":
          acc.preparing += 1;
          break;
        case "completed":
          acc.completed += 1;
          break;
        default:
          break;
      }
      return acc;
    },
    { ...EMPTY }
  );
}

export function useMarketplaceOrderCounts() {
  const [counts, setCounts] = useState<MarketplaceOrderCounts>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getMarketplaceOrders({ page: 1, limit: 200 });
      setCounts(countByStatus(response.data ?? []));
    } catch {
      setCounts(EMPTY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useMarketplaceOrderRefresh(refetch);

  return { counts, isLoading, refetch };
}
