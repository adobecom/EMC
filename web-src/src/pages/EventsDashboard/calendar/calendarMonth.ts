/*
* <license header>
*/

import {
  CalendarDate,
  today,
  getLocalTimeZone,
  startOfWeek,
  getWeeksInMonth,
  parseDate,
} from '@internationalized/date'
import { EventDashboardItem } from '../../../types/domain'

export interface CalendarDayCell {
  date: CalendarDate
  isCurrentMonth: boolean
  isToday: boolean
  /** YYYY-MM-DD — matches EventDashboardItem.localStartDate for direct string-equality lookup */
  dateKey: string
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toDateKey(d: CalendarDate): string {
  return `${d.year}-${padTwo(d.month)}-${padTwo(d.day)}`
}

/**
 * Returns a 2D array of week rows × 7 day-cells covering the full visible month grid.
 * Uses startOfWeek / getWeeksInMonth from @internationalized/date so the grid
 * respects locale week-start (e.g. Sunday for en-US, Monday for en-GB).
 *
 * IMPORTANT: localStartDate values from the API are wall-clock YYYY-MM-DD strings.
 * Never use new Date() on them. Use string equality against cell.dateKey instead.
 */
export function buildMonthGrid(month: CalendarDate, locale: string): CalendarDayCell[][] {
  const todayDate = today(getLocalTimeZone())
  const firstOfMonth = new CalendarDate(month.year, month.month, 1)
  const gridStart = startOfWeek(firstOfMonth, locale)
  const weeks = getWeeksInMonth(firstOfMonth, locale)

  const result: CalendarDayCell[][] = []

  for (let w = 0; w < weeks; w++) {
    const week: CalendarDayCell[] = []
    for (let d = 0; d < 7; d++) {
      const cell = gridStart.add({ days: w * 7 + d })
      week.push({
        date: cell,
        isCurrentMonth: cell.month === month.month && cell.year === month.year,
        isToday: cell.compare(todayDate) === 0,
        dateKey: toDateKey(cell),
      })
    }
    result.push(week)
  }

  return result
}

/**
 * Groups events by their localStartDate string.
 * Events with a missing or unparseable date are collected into undated[].
 * Placement key is the raw YYYY-MM-DD string, matching CalendarDayCell.dateKey.
 */
export function groupEventsByDate(events: EventDashboardItem[]): {
  byDate: Map<string, EventDashboardItem[]>
  undated: EventDashboardItem[]
} {
  const byDate = new Map<string, EventDashboardItem[]>()
  const undated: EventDashboardItem[] = []

  for (const event of events) {
    if (!event.localStartDate) {
      undated.push(event)
      continue
    }
    try {
      parseDate(event.localStartDate) // validate format; throws on invalid
      const key = event.localStartDate
      const existing = byDate.get(key)
      if (existing) {
        existing.push(event)
      } else {
        byDate.set(key, [event])
      }
    } catch {
      undated.push(event)
    }
  }

  return { byDate, undated }
}

/**
 * Returns a human-readable month + year string, e.g. "June 2026".
 * Uses Intl.DateTimeFormat with the CalendarDate's numeric fields directly
 * (no ISO string parsing, no UTC shift).
 */
export function getMonthTitle(month: CalendarDate, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(month.year, month.month - 1, 1)
  )
}

export function nextMonth(m: CalendarDate): CalendarDate {
  return m.add({ months: 1 })
}

export function prevMonth(m: CalendarDate): CalendarDate {
  return m.subtract({ months: 1 })
}

export function currentMonthStart(): CalendarDate {
  const t = today(getLocalTimeZone())
  return new CalendarDate(t.year, t.month, 1)
}
