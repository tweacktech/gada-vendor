import { useEffect } from "react"

import { auth } from "@/lib/auth"
import { getEchoClient } from "@/lib/echo"
import {
  normalizeMarketplaceStatusPayload,
  subscribeMarketplaceOrderRefresh,
  type MarketplaceOrderRefreshHandler,
} from "@/lib/marketplace-realtime"

const POLL_MS = 30_000

/** Polls and listens for marketplace order status changes while a view is mounted. */
export function useMarketplaceLiveSync(onChange: MarketplaceOrderRefreshHandler): void {
  useEffect(() => subscribeMarketplaceOrderRefresh(onChange), [onChange])

  useEffect(() => {
    const interval = window.setInterval(() => {
      onChange()
    }, POLL_MS)
    return () => window.clearInterval(interval)
  }, [onChange])

  useEffect(() => {
    const user = auth.getCurrentUser()
    const echo = getEchoClient()
    if (!user || !echo) return

    const channelName = `App.Models.User.${user.id}`
    const channel = echo.private(channelName)

    const handle = (raw: unknown) => {
      onChange(normalizeMarketplaceStatusPayload(raw))
    }

    channel.listen(".marketplace-order.status", handle)
    channel.listen("marketplace-order.status", handle)
    channel.listen(".notification", handle)
    channel.listen("notification", handle)
    channel.notification(handle)

    return () => {
      channel.stopListening(".marketplace-order.status")
      channel.stopListening("marketplace-order.status")
      channel.stopListening(".notification")
      channel.stopListening("notification")
    }
  }, [onChange])
}
