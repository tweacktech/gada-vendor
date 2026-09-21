"use client"

import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon, ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DATE_FILTER_PRESETS, getFilterLabel, type DateFilterValue } from "@/lib/dateFilter"

// ✅ Export the type for other files
export type { DateFilterValue }

interface OrderDateFilterProps {
    value: DateFilterValue | null
    onChange: (value: DateFilterValue | null) => void
}

export function OrderDateFilter({ value, onChange }: OrderDateFilterProps) {
    const [open, setOpen] = useState(false)
    const [showCalendar, setShowCalendar] = useState(false)
    const [range, setRange] = useState<DateRange | undefined>(
        value?.type === "custom" ? { from: value.startDate, to: value.endDate } : undefined
    )

    function handlePresetSelect(presetValue: string) {
        if (presetValue === "custom") {
            setShowCalendar(true)
            return
        }
        onChange({ type: presetValue as Exclude<DateFilterValue["type"], "custom"> })
        setOpen(false)
    }

    function handleRangeSelect(selected: DateRange | undefined) {
        setRange(selected)
    }

    function handleApply() {
        if (!range?.from || !range?.to) return
        onChange({ type: "custom", startDate: range.from, endDate: range.to })
        setOpen(false)
        setShowCalendar(false)
    }

    function handleCancel() {
        setRange(value?.type === "custom" ? { from: value.startDate, to: value.endDate } : undefined)
        setShowCalendar(false)
    }

    function handleOpenChange(next: boolean) {
        setOpen(next)
        if (!next) setShowCalendar(false)
    }

    useEffect(() => {
        if (open) {
            setRange(value?.type === "custom" ? { from: value.startDate, to: value.endDate } : undefined)
        }
    }, [open, value])

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <CalendarIcon className="size-4" />
                    {getFilterLabel(value)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("p-0", showCalendar ? "w-auto" : "w-48")} align="end">
                {!showCalendar ? (
                    <div className="flex flex-col p-1">
                        {DATE_FILTER_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => handlePresetSelect(preset.value)}
                                className={cn(
                                    "rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                                    value?.type === preset.value && "bg-accent text-accent-foreground font-medium"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-1">
                        <button
                            type="button"
                            onClick={() => setShowCalendar(false)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 text-xs"
                        >
                            <ChevronLeftIcon className="size-3" />
                            Back
                        </button>
                        <Calendar
                            mode="range"
                            selected={range}
                            onSelect={handleRangeSelect}
                            numberOfMonths={2}
                            defaultMonth={range?.from ?? new Date()}
                            disabled={{ after: new Date() }}
                        />
                        <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
                            <span className="text-muted-foreground text-xs">
                                {range?.from && range?.to
                                    ? `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`
                                    : range?.from
                                      ? "Pick an end date"
                                      : "Pick a start date"}
                            </span>
                            <div className="flex gap-1.5">
                                <Button variant="ghost" size="sm" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button size="sm" disabled={!range?.from || !range?.to} onClick={handleApply}>
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}