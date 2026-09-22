import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useMarketplaceLiveSync } from "@/hooks/useMarketplaceLiveSync";
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

  const refetch = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    try {
      const response = await api.getMarketplaceOrders({ page: 1, limit: 200 });
      setCounts(countByStatus(response.data ?? []));
    } catch {
      if (!opts?.silent) setCounts(EMPTY);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useMarketplaceLiveSync(() => {
    void refetch({ silent: true });
  });

  return { counts, isLoading, refetch };
}
