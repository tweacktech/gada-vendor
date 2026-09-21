// hooks/useDashboardMetrics.ts
import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { dateFilterToParams, type DateFilterValue } from "@/lib/dateFilter"

interface DashboardMetrics {
    total_revenue: number
    revenue_change_pct: number
    total_orders: number
    orders_change_pct: number
    conversion_rate: number
    conversion_change_pct: number
}

interface UseDashboardMetricsOptions {
    dateFilter?: DateFilterValue | null
}

export function useDashboardMetrics({ dateFilter = null }: UseDashboardMetricsOptions = {}) {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMetrics = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await api.getDashboardMetrics(dateFilterToParams(dateFilter))
            setMetrics(response)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch metrics")
        } finally {
            setIsLoading(false)
        }
    }, [dateFilter])

    useEffect(() => {
        fetchMetrics()
    }, [fetchMetrics])

    return {
        metrics,
        isLoading,
        error,
        refetch: fetchMetrics,
    }
}