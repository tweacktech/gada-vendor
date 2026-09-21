// lib/dateFilter.ts
import { format } from "date-fns"

export type DateFilterValue =
    | { type: "today" | "yesterday" | "week" | "month" | "year" }
    | { type: "custom"; startDate: Date; endDate: Date }

export const DATE_FILTER_PRESETS: { value: string; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "This month" },
    { value: "year", label: "This year" },
    { value: "custom", label: "Custom range" },
]

/** Human-readable label for a badge/pill showing the active filter. */
export function getFilterLabel(filter: DateFilterValue | null): string {
    if (!filter) return "All time"

    if (filter.type === "custom") {
        return `${format(filter.startDate, "MMM d")} - ${format(filter.endDate, "MMM d")}`
    }

    const preset = DATE_FILTER_PRESETS.find((p) => p.value === filter.type)
    return preset?.label ?? filter.type
}

/**
 * Converts a DateFilterValue into query params for the API.
 *
 * Presets ("today", "week", ...) are sent as-is via `filter=` and resolved
 * to a concrete date range on the backend — that way there's exactly one
 * place ("what does 'this week' mean") instead of the frontend and backend
 * each computing it independently and risking drift (timezones, "now"
 * being a few seconds apart, etc).
 *
 * Only "custom" ranges carry explicit start/end dates, since those come
 * from the date picker and the backend has no other way to know them.
 */
export function dateFilterToParams(filter: DateFilterValue | null): Record<string, string> {
    if (!filter) return {}

    if (filter.type === "custom") {
        return {
            start_date: filter.startDate.toISOString(),
            end_date: filter.endDate.toISOString(),
        }
    }

    return { filter: filter.type }
}
