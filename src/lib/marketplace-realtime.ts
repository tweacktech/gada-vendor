/** Lightweight pub/sub so websocket events can refresh lists without prop drilling. */

type RefreshListener = () => void

const listeners = new Set<RefreshListener>()

export function subscribeMarketplaceOrderRefresh(listener: RefreshListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitMarketplaceOrderRefresh(): void {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (err) {
      console.error("[marketplace-realtime] refresh listener failed", err)
    }
  })
}
