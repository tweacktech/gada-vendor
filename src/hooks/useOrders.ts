// hooks/useOrders.ts
import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { Order } from "@/types/logistics"
import { dateFilterToParams, type DateFilterValue } from "@/lib/dateFilter"

interface UseOrdersOptions {
    page?: number
    limit?: number
    dateFilter?: DateFilterValue | null
}

export function useOrders({ page = 1, limit = 10, dateFilter = null }: UseOrdersOptions = {}) {
    const [orders, setOrders] = useState<Order[]>([])
    const [total, setTotal] = useState(0)
    const [currentPage, setCurrentPage] = useState(page)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // The filter can be driven two ways: as the `dateFilter` prop (from a
    // parent that owns the state, e.g. the dashboard page), or via the
    // `setDateFilter` this hook returns (for consumers, like OrdersTable,
    // that manage it internally). Internal state mirrors the prop so both
    // paths work.
    const [currentDateFilter, setCurrentDateFilter] = useState<DateFilterValue | null>(dateFilter)

    useEffect(() => {
        setCurrentDateFilter(dateFilter)
        setCurrentPage(1)
    }, [dateFilter])

    const fetchOrders = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const params: Record<string, unknown> = {
                page: currentPage,
                limit,
                ...dateFilterToParams(currentDateFilter),
            }

            const response = await api.getOrders(params)
            setOrders(response.data || [])
            setTotal(response.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch orders")
            setOrders([])
            setTotal(0)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, limit, currentDateFilter])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Stable identity is essential here: OrdersTable calls this from inside
    // a useEffect keyed on [dateFilter, setDateFilter]. If this function
    // were recreated every render (e.g. a plain arrow function), that
    // effect would re-fire on every render too — including the ones
    // triggered by clicking "Next" — and setCurrentPage(1) below would
    // stomp the page change right back to 1.
    const setDateFilter = useCallback((newFilter: DateFilterValue | null) => {
        setCurrentDateFilter(newFilter)
        setCurrentPage(1)
    }, [])

    return {
        orders,
        total,
        page: currentPage,
        isLoading,
        error,
        setPage: setCurrentPage,
        setDateFilter,
        refetch: fetchOrders,
    }
}