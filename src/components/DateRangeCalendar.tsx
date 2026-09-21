"use client"
import "styled-jsx"

import { useState } from "react"
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    startOfMonth,
    startOfWeek,
    endOfWeek,
} from "date-fns"

interface DateRangeCalendarProps {
    startDate?: Date
    endDate?: Date
    onChange: (range: { startDate: Date; endDate: Date }) => void
    /** Month to show in the left calendar. Right calendar is always +1. Defaults to the month of startDate, or today. */
    initialMonth?: Date
}

/**
 * Two-month calendar for picking a date range by clicking a start day,
 * then an end day. Hovering after the start is picked previews the range.
 * No external calendar library — built on date-fns, which the rest of the
 * date-filter code already depends on.
 */
export function DateRangeCalendar({ startDate, endDate, onChange, initialMonth }: DateRangeCalendarProps) {
    const [leftMonth, setLeftMonth] = useState(startOfMonth(initialMonth ?? startDate ?? new Date()))
    // Local in-progress selection, so picking "start" doesn't clobber the
    // committed range until "end" is also picked.
    const [pendingStart, setPendingStart] = useState<Date | null>(null)
    const [hoverDate, setHoverDate] = useState<Date | null>(null)

    const rightMonth = addMonths(leftMonth, 1)

    function handleDayClick(day: Date) {
        if (!pendingStart) {
            setPendingStart(day)
            return
        }

        const start = isBefore(day, pendingStart) ? day : pendingStart
        const end = isBefore(day, pendingStart) ? pendingStart : day
        onChange({ startDate: start, endDate: end })
        setPendingStart(null)
        setHoverDate(null)
    }

    // What to actually highlight: the committed range, unless the user is
    // mid-selection, in which case preview pendingStart -> hoverDate.
    const previewStart = pendingStart ?? startDate
    const previewEnd = pendingStart ? hoverDate ?? pendingStart : endDate

    return (
        <div className="drc-root">
            <div className="drc-months">
                <Month
                    month={leftMonth}
                    onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                    showPrev
                    onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                    showNext={false}
                    rangeStart={previewStart}
                    rangeEnd={previewEnd}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                />
                <Month
                    month={rightMonth}
                    onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                    showPrev={false}
                    onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                    showNext
                    rangeStart={previewStart}
                    rangeEnd={previewEnd}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                />
            </div>

            <div className="drc-footer">
                <span className="drc-footer-text">
                    {previewStart && previewEnd
                        ? `${format(previewStart, "MMM d, yyyy")} – ${format(previewEnd, "MMM d, yyyy")}`
                        : pendingStart
                          ? "Pick an end date"
                          : "Pick a start date"}
                </span>
            </div>

            <style jsx>{`
                .drc-root {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    font-family: inherit;
                }
                .drc-months {
                    display: flex;
                    gap: 24px;
                }
                @media (max-width: 520px) {
                    .drc-months {
                        flex-direction: column;
                        gap: 16px;
                    }
                }
                .drc-footer {
                    padding-top: 8px;
                    border-top: 1px solid var(--drc-border, #e5e5e5);
                    font-size: 13px;
                    color: var(--drc-muted, #666);
                }
            `}</style>
        </div>
    )
}

interface MonthProps {
    month: Date
    onPrev: () => void
    onNext: () => void
    showPrev: boolean
    showNext: boolean
    rangeStart?: Date | null
    rangeEnd?: Date | null
    onDayClick: (day: Date) => void
    onDayHover: (day: Date | null) => void
}

function Month({ month, onPrev, onNext, showPrev, showNext, rangeStart, rangeEnd, onDayClick, onDayHover }: MonthProps) {
    const gridStart = startOfWeek(startOfMonth(month))
    const gridEnd = endOfWeek(endOfMonth(month))
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
    const today = new Date()

    const [lo, hi] =
        rangeStart && rangeEnd
            ? isBefore(rangeStart, rangeEnd)
                ? [rangeStart, rangeEnd]
                : [rangeEnd, rangeStart]
            : [rangeStart ?? null, rangeStart ?? null]

    return (
        <div className="drc-month">
            <div className="drc-month-header">
                <button
                    type="button"
                    className="drc-nav-btn"
                    onClick={onPrev}
                    aria-label="Previous month"
                    style={{ visibility: showPrev ? "visible" : "hidden" }}
                >
                    ‹
                </button>
                <span className="drc-month-label">{format(month, "MMMM yyyy")}</span>
                <button
                    type="button"
                    className="drc-nav-btn"
                    onClick={onNext}
                    aria-label="Next month"
                    style={{ visibility: showNext ? "visible" : "hidden" }}
                >
                    ›
                </button>
            </div>

            <div className="drc-weekdays">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="drc-weekday">
                        {d}
                    </span>
                ))}
            </div>

            <div className="drc-grid">
                {days.map((day) => {
                    const inMonth = isSameMonth(day, month)
                    const isStart = lo ? isSameDay(day, lo) : false
                    const isEnd = hi ? isSameDay(day, hi) : false
                    const inRange = lo && hi ? isWithinInterval(day, { start: lo, end: hi }) : false
                    const isToday = isSameDay(day, today)
                    const isFuture = isAfter(day, today)

                    return (
                        <button
                            type="button"
                            key={day.toISOString()}
                            className="drc-day"
                            data-in-month={inMonth}
                            data-in-range={inRange}
                            data-endpoint={isStart || isEnd}
                            data-today={isToday}
                            disabled={isFuture}
                            onClick={() => onDayClick(day)}
                            onMouseEnter={() => onDayHover(day)}
                        >
                            {format(day, "d")}
                        </button>
                    )
                })}
            </div>

            <style jsx>{`
                .drc-month {
                    flex: 1;
                    min-width: 240px;
                }
                .drc-month-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .drc-month-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--drc-text, #1a1a1a);
                }
                .drc-nav-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 18px;
                    line-height: 1;
                    padding: 4px 8px;
                    border-radius: 6px;
                    color: var(--drc-text, #1a1a1a);
                }
                .drc-nav-btn:hover {
                    background: var(--drc-hover-bg, #f0f0f0);
                }
                .drc-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    margin-bottom: 4px;
                }
                .drc-weekday {
                    text-align: center;
                    font-size: 11px;
                    font-weight: 500;
                    color: var(--drc-muted, #999);
                    padding: 4px 0;
                }
                .drc-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px;
                }
                .drc-day {
                    aspect-ratio: 1;
                    border: none;
                    background: none;
                    border-radius: 8px;
                    font-size: 13px;
                    cursor: pointer;
                    color: var(--drc-text, #1a1a1a);
                }
                .drc-day:hover:not(:disabled) {
                    background: var(--drc-hover-bg, #f0f0f0);
                }
                .drc-day:disabled {
                    color: var(--drc-disabled, #ccc);
                    cursor: not-allowed;
                }
                .drc-day[data-in-month="false"] {
                    color: var(--drc-outside, #ccc);
                }
                .drc-day[data-in-range="true"] {
                    background: var(--drc-range-bg, #e8e0fb);
                    border-radius: 0;
                }
                .drc-day[data-endpoint="true"] {
                    background: var(--drc-accent, #6d28d9);
                    color: #fff;
                    border-radius: 8px;
                }
                .drc-day[data-today="true"]:not([data-endpoint="true"]) {
                    box-shadow: inset 0 0 0 1px var(--drc-accent, #6d28d9);
                }
            `}</style>
        </div>
    )
}
