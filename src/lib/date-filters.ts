import {
    endOfDay,
    endOfMonth,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfYear,
    subDays,
} from "date-fns"

import type { DateFilterValue } from "@/components/orders/OrderDateFilter"

export function dateFilterToRange(value: DateFilterValue): { start: Date; end: Date } {
    const now = new Date()

    switch (value.type) {
        case "today":
            return { start: startOfDay(now), end: endOfDay(now) }
        case "yesterday": {
            const yesterday = subDays(now, 1)
            return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
        }
        case "week":
            return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
        case "month":
            return { start: startOfMonth(now), end: endOfMonth(now) }
        case "year":
            return { start: startOfYear(now), end: endOfYear(now) }
        case "custom":
            return {
                start: startOfDay(value.startDate),
                end: endOfDay(value.endDate),
            }
    }
}

export function dateFilterToParams(
    value: DateFilterValue | null
): { start_date?: string; end_date?: string } {
    if (!value) return {}

    const { start, end } = dateFilterToRange(value)
    return {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
    }
}
