// hooks/useDashboardMetrics.ts
import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { dateFilterToParams, type DateFilterValue } from "@/lib/dateFilter"
import type { DashboardMetrics } from "@/types/logistics"

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
            const response = await api.getMarketplaceDashboardMetrics(dateFilterToParams(dateFilter, { all: true }))
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