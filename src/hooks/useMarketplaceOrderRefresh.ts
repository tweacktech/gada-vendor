import { useEffect } from "react"

import { subscribeMarketplaceOrderRefresh } from "@/lib/marketplace-realtime"

/** Re-runs `onRefresh` whenever a `marketplace-order.status` event is received. */
export function useMarketplaceOrderRefresh(onRefresh: () => void): void {
  useEffect(() => subscribeMarketplaceOrderRefresh(onRefresh), [onRefresh])
}
