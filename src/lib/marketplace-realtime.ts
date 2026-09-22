/** Lightweight pub/sub so websocket events can refresh lists without prop drilling. */

import type { MarketplaceOrderStatusChangedPayload } from "@/types/marketplace"

export type MarketplaceOrderRefreshHandler = (
  payload?: MarketplaceOrderStatusChangedPayload
) => void

const listeners = new Set<MarketplaceOrderRefreshHandler>()

export function subscribeMarketplaceOrderRefresh(
  listener: MarketplaceOrderRefreshHandler
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitMarketplaceOrderRefresh(
  payload?: MarketplaceOrderStatusChangedPayload
): void {
  listeners.forEach((listener) => {
    try {
      listener(payload)
    } catch (err) {
      console.error("[marketplace-realtime] refresh listener failed", err)
    }
  })
}

export function normalizeMarketplaceStatusPayload(
  raw: unknown
): MarketplaceOrderStatusChangedPayload | undefined {
  if (!raw || typeof raw !== "object") return undefined

  const root = raw as Record<string, unknown>
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root

  const id = nested.marketplace_order_id ?? nested.order_id ?? nested.id
  const status = nested.status ?? nested.current_status
  if (id == null || status == null) return undefined

  return {
    marketplace_order_id: Number(id),
    order_number: String(nested.order_number ?? ""),
    status: String(status) as MarketplaceOrderStatusChangedPayload["status"],
    previous_status:
      nested.previous_status != null
        ? (String(nested.previous_status) as MarketplaceOrderStatusChangedPayload["previous_status"])
        : null,
    agent_status: nested.agent_status != null ? String(nested.agent_status) : null,
    previous_agent_status:
      nested.previous_agent_status != null ? String(nested.previous_agent_status) : null,
    vendor_id: Number(nested.vendor_id ?? 0),
    agent_id: nested.agent_id != null ? Number(nested.agent_id) : null,
    rider_id: nested.rider_id != null ? Number(nested.rider_id) : null,
    updated_at: String(nested.updated_at ?? new Date().toISOString()),
  }
}
