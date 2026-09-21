import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { Order } from "@/types/logistics"

interface UseOrderResult {
    order: Order | null
    isLoading: boolean
    error: string | null
    refetch: () => void
}

export function useOrder(orderId: string): UseOrderResult {
    const [order, setOrder] = useState<Order | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(() => {
        setIsLoading(true)
        setError(null)
        api.getOrder(orderId)
            .then(setOrder)
            .catch((err: unknown) => {
                setError(
                    err instanceof Error ? err.message : "Failed to load order."
                )
            })
            .finally(() => setIsLoading(false))
    }, [orderId])

    useEffect(() => {
        fetch()
    }, [fetch])

    return { order, isLoading, error, refetch: fetch }
}
