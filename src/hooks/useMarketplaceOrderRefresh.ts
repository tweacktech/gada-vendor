import { useEffect } from "react"

import {
  subscribeMarketplaceOrderRefresh,
  type MarketplaceOrderRefreshHandler,
} from "@/lib/marketplace-realtime"

/** Re-runs `onRefresh` whenever a marketplace order status event is received. */
export function useMarketplaceOrderRefresh(onRefresh: MarketplaceOrderRefreshHandler): void {
  useEffect(() => subscribeMarketplaceOrderRefresh(onRefresh), [onRefresh])
}
