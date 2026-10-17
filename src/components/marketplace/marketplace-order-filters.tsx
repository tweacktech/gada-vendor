import { useEffect, useState } from "react"

import { OrderDateFilter } from "@/components/orders/OrderDateFilter"
import { Input } from "@/components/ui/input"
import type { DateFilterValue } from "@/lib/dateFilter"

interface MarketplaceOrderFiltersProps {
    dateFilter: DateFilterValue | null
    onDateFilterChange: (value: DateFilterValue | null) => void
    minAmount: string
    maxAmount: string
    onMinAmountChange: (value: string) => void
    onMaxAmountChange: (value: string) => void
    showDateFilter?: boolean
}

function AmountField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    const [draft, setDraft] = useState(value)

    useEffect(() => {
        setDraft(value)
    }, [value])

    useEffect(() => {
        if (draft === value) return
        const timer = window.setTimeout(() => onChange(draft), 400)
        return () => window.clearTimeout(timer)
    }, [draft, value, onChange])

    return (
        <Input
            inputMode="decimal"
            placeholder={label}
            aria-label={label}
            className="h-8 w-32"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
        />
    )
}

export function MarketplaceOrderFilters({
    dateFilter,
    onDateFilterChange,
    minAmount,
    maxAmount,
    onMinAmountChange,
    onMaxAmountChange,
}: MarketplaceOrderFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <AmountField label="Min amount" value={minAmount} onChange={onMinAmountChange} />
            <AmountField label="Max amount" value={maxAmount} onChange={onMaxAmountChange} />
            <OrderDateFilter value={dateFilter} onChange={onDateFilterChange} />
        </div>
    )
}
