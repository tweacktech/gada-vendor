import { useState, useEffect, useCallback } from "react"
import { api, ApiError } from "@/lib/api"
import { useMarketplaceLiveSync } from "@/hooks/useMarketplaceLiveSync"
import type {
    MarketplaceOrder,
    MarketplaceOrderStatusChangedPayload,
    MarketplaceOrderTimelineResponse,
} from "@/types/marketplace"

interface UseMarketplaceOrderResult {
    order: MarketplaceOrder | null
    timeline: MarketplaceOrderTimelineResponse | null
    isLoading: boolean
    error: string | null
    refetch: () => void
}

export function useMarketplaceOrder(orderId: string): UseMarketplaceOrderResult {
    const [order, setOrder] = useState<MarketplaceOrder | null>(null)
    const [timeline, setTimeline] = useState<MarketplaceOrderTimelineResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async (
        opts?: { silent?: boolean; payload?: MarketplaceOrderStatusChangedPayload }
    ) => {
        if (!opts?.silent) {
            setIsLoading(true)
            setError(null)
        }
        try {
            const [nextOrder, nextTimeline] = await Promise.all([
                api.getMarketplaceOrder(orderId),
                api.getMarketplaceOrderTimeline(orderId).catch(() => null),
            ])
            const status = opts?.payload?.status ?? nextTimeline?.current_status ?? nextOrder.status
            setOrder({
                ...nextOrder,
                status: (status as MarketplaceOrder["status"]) ?? nextOrder.status,
                pin: nextTimeline?.pin ?? nextOrder.pin,
                timeline: nextTimeline
                    ? { steps: nextTimeline.steps, other_events: nextTimeline.other_events ?? [] }
                    : nextOrder.timeline,
            })
            setTimeline(nextTimeline)
            setError(null)
        } catch (err: unknown) {
            if (opts?.payload) {
                setOrder((current) =>
                    current
                        ? {
                            ...current,
                            status: opts.payload!.status,
                            agent_status: opts.payload!.agent_status,
                        }
                        : current
                )
            } else if (!opts?.silent) {
                setError(
                    err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                            ? err.message
                            : "Failed to load order."
                )
            }
        } finally {
            if (!opts?.silent) setIsLoading(false)
        }
    }, [orderId])

    const handleRealtime = useCallback((payload?: MarketplaceOrderStatusChangedPayload) => {
        if (payload && String(payload.marketplace_order_id) !== String(orderId)) {
            if (payload.order_number) {
                setOrder((current) => {
                    if (!current || current.order_number !== payload.order_number) return current
                    return { ...current, status: payload.status, agent_status: payload.agent_status }
                })
            }
        } else if (payload) {
            setOrder((current) =>
                current
                    ? { ...current, status: payload.status, agent_status: payload.agent_status }
                    : current
            )
        }
        void fetch({ silent: true, payload })
    }, [fetch, orderId])

    useEffect(() => {
        void fetch()
    }, [fetch])

    useMarketplaceLiveSync(handleRealtime)

    return { order, timeline, isLoading, error, refetch: fetch }
}
