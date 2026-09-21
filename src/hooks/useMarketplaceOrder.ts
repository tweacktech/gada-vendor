import { useState, useEffect, useCallback } from "react"
import { api, ApiError } from "@/lib/api"
import { useMarketplaceOrderRefresh } from "@/hooks/useMarketplaceOrderRefresh"
import type { MarketplaceOrder } from "@/types/marketplace"

interface UseMarketplaceOrderResult {
    order: MarketplaceOrder | null
    isLoading: boolean
    error: string | null
    refetch: () => void
}

export function useMarketplaceOrder(orderId: string): UseMarketplaceOrderResult {
    const [order, setOrder] = useState<MarketplaceOrder | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(() => {
        setIsLoading(true)
        setError(null)
        api
            .getMarketplaceOrder(orderId)
            .then(setOrder)
            .catch((err: unknown) => {
                setError(
                    err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                            ? err.message
                            : "Failed to load order."
                )
            })
            .finally(() => setIsLoading(false))
    }, [orderId])

    useEffect(() => {
        fetch()
    }, [fetch])

    useMarketplaceOrderRefresh(fetch)

    return { order, isLoading, error, refetch: fetch }
}
