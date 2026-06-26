/*
* <license header>
*/

import React, { useState, useRef, useMemo, useEffect } from 'react'
import { ActionButton, Button, Text, Heading, Popover } from '@react-spectrum/s2'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import { CalendarDate } from '@internationalized/date'
import {
  buildMonthGrid,
  groupEventsByDate,
  getMonthTitle,
  nextMonth,
  prevMonth,
  currentMonthStart,
} from './calendarMonth'
import { EventDashboardItem } from '../../../types/domain'
import { EventThumbnail } from '../../../services/eventEnrichment'
import { SPACING } from '../../../styles/designSystem'

export interface EventCalendarProps {
  /** Events to render — already search + list filtered by the parent */
  events: EventDashboardItem[]
  /** BCP 47 locale used for month/weekday formatting and week-start. Defaults to 'en-US'. */
  locale?: string
  /** Max event chips visible per day before "+N more" overflow. Defaults to 2. */
  maxChipsPerDay?: number
  /** Thumbnail map keyed by eventId — passed from EventsDashboard's enrichment state */
  thumbnails?: Map<string, EventThumbnail>
  /** Set of event IDs currently being loaded — used to show loading placeholders */
  loadingThumbnails?: Set<string>
  /**
   * Fires with the event IDs that fall in the current calendar month whenever
   * the month or the event list changes. The parent uses this to trigger
   * thumbnail/enrichment loading for the visible month.
   */
  onMonthEventIds?: (ids: string[]) => void
  /**
   * Renders the event detail Popover for a chip. The parent (EventsDashboard) provides this
   * to close over enrichment maps, handleMenuAction, and permissions without drilling them
   * all the way down into individual chips.
   */
  renderEventPopover: (
    item: EventDashboardItem,
    triggerRef: React.RefObject<HTMLDivElement | null>,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void
  ) => React.ReactNode
}

// ─── EventChip ────────────────────────────────────────────────────────────────

interface EventChipProps {
  item: EventDashboardItem
  thumbnails?: Map<string, EventThumbnail>
  loadingThumbnails?: Set<string>
  renderEventPopover: EventCalendarProps['renderEventPopover']
}

/**
 * A single event chip inside a day cell. Shows a thumbnail on the left and
 * event name + start time on the right. Owns its own popover trigger ref and
 * open state so multiple chips on the same day can have independent popovers.
 */
function EventChip({ item, thumbnails, loadingThumbnails, renderEventPopover }: EventChipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const thumbnail = thumbnails?.get(item.eventId)
  const isLoadingThumbnail = loadingThumbnails?.has(item.eventId) ?? false

  const chipBg = item.published
    ? 'var(--spectrum-global-color-blue-500)'
    : 'var(--spectrum-global-color-gray-500)'

  const thumbShade = item.published
    ? 'var(--spectrum-global-color-blue-600)'
    : 'var(--spectrum-global-color-gray-600)'

  return (
    <div ref={wrapperRef}>
      <ActionButton
        isQuiet
        onPress={() => setIsOpen(true)}
        aria-label={`View details for ${item.eventName}`}
        UNSAFE_style={{
          display: 'flex',
          alignItems: 'stretch',
          width: '100%',
          padding: 0,
          minHeight: 'unset',
          height: 'auto',
          borderRadius: 4,
          backgroundColor: chipBg,
          color: 'white',
          textAlign: 'left',
          overflow: 'hidden',
        }}
      >
        {/* Thumbnail column */}
        <div
          style={{
            width: 40,
            flexShrink: 0,
            backgroundColor: thumbShade,
            overflow: 'hidden',
            minHeight: 48,
          }}
        >
          {thumbnail?.imageUrl ? (
            <img
              src={thumbnail.imageUrl}
              alt={thumbnail.altText || item.eventName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: thumbShade,
                opacity: isLoadingThumbnail ? 0.5 : 1,
              }}
            />
          )}
        </div>

        {/* Text column */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: '5px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              lineHeight: '14px',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {item.eventName}
          </span>
          {item.localStartTime && (
            <span
              style={{
                fontSize: '10px',
                lineHeight: '12px',
                color: 'white',
                opacity: 0.85,
                whiteSpace: 'nowrap',
              }}
            >
              {item.localStartTime}
            </span>
          )}
        </div>
      </ActionButton>
      {renderEventPopover(item, wrapperRef, isOpen, setIsOpen)}
    </div>
  )
}

// ─── OverflowButton ───────────────────────────────────────────────────────────

interface OverflowButtonProps {
  items: EventDashboardItem[]
  thumbnails?: Map<string, EventThumbnail>
  loadingThumbnails?: Set<string>
  renderEventPopover: EventCalendarProps['renderEventPopover']
}

/**
 * "+N more" button that opens a small popover listing the overflow chips.
 * Each chip inside the overflow popover can itself open the full detail popover.
 */
function OverflowButton({ items, thumbnails, loadingThumbnails, renderEventPopover }: OverflowButtonProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div ref={wrapperRef}>
      <ActionButton
        isQuiet
        onPress={() => setIsOpen(true)}
        aria-label={`${items.length} more event${items.length > 1 ? 's' : ''}`}
        UNSAFE_style={{
          width: '100%',
          padding: '1px 6px',
          minHeight: 'unset',
          height: 'auto',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--spectrum-global-color-blue-700)',
          justifyContent: 'flex-start',
        }}
      >
        <Text>+{items.length} more</Text>
      </ActionButton>
      <Popover
        triggerRef={wrapperRef as React.RefObject<Element | null>}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom"
      >
        <div
          style={{
            padding: SPACING.SM,
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Text
            UNSAFE_style={{
              fontSize: '11px',
              color: 'var(--spectrum-global-color-gray-600)',
              marginBottom: 4,
            }}
          >
            Additional events
          </Text>
          {items.map(item => (
            <EventChip
              key={item.eventId}
              item={item}
              thumbnails={thumbnails}
              loadingThumbnails={loadingThumbnails}
              renderEventPopover={renderEventPopover}
            />
          ))}
        </div>
      </Popover>
    </div>
  )
}

// ─── DayCell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  events: EventDashboardItem[]
  maxChips: number
  thumbnails?: Map<string, EventThumbnail>
  loadingThumbnails?: Set<string>
  renderEventPopover: EventCalendarProps['renderEventPopover']
}

function DayCell({
  dayNumber,
  isCurrentMonth,
  isToday,
  events,
  maxChips,
  thumbnails,
  loadingThumbnails,
  renderEventPopover,
}: DayCellProps) {
  const visibleEvents = events.slice(0, maxChips)
  const overflowEvents = events.slice(maxChips)

  return (
    <div
      style={{
        minHeight: 180,
        padding: '4px 4px 6px',
        borderRight: '1px solid var(--spectrum-global-color-gray-200)',
        borderBottom: '1px solid var(--spectrum-global-color-gray-200)',
        backgroundColor: isCurrentMonth
          ? 'var(--spectrum-global-color-gray-50)'
          : 'var(--spectrum-global-color-gray-100)',
        overflow: 'hidden',
      }}
    >
      {/* Day number */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: isToday ? 700 : 400,
            color: isToday
              ? 'white'
              : isCurrentMonth
                ? 'var(--spectrum-global-color-gray-800)'
                : 'var(--spectrum-global-color-gray-400)',
            width: 22,
            height: 22,
            lineHeight: '22px',
            textAlign: 'center',
            borderRadius: '50%',
            backgroundColor: isToday
              ? 'var(--spectrum-global-color-blue-500)'
              : 'transparent',
            display: 'inline-block',
            flexShrink: 0,
          }}
        >
          {dayNumber}
        </span>
      </div>

      {/* Event chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {visibleEvents.map(item => (
          <EventChip
            key={item.eventId}
            item={item}
            thumbnails={thumbnails}
            loadingThumbnails={loadingThumbnails}
            renderEventPopover={renderEventPopover}
          />
        ))}
        {overflowEvents.length > 0 && (
          <OverflowButton
            items={overflowEvents}
            thumbnails={thumbnails}
            loadingThumbnails={loadingThumbnails}
            renderEventPopover={renderEventPopover}
          />
        )}
      </div>
    </div>
  )
}

// ─── EventCalendar ────────────────────────────────────────────────────────────

export const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  locale = 'en-US',
  maxChipsPerDay = 2,
  thumbnails,
  loadingThumbnails,
  onMonthEventIds,
  renderEventPopover,
}) => {
  const [month, setMonth] = useState<CalendarDate>(() => currentMonthStart())

  const { byDate, undated } = useMemo(() => groupEventsByDate(events), [events])

  const grid = useMemo(() => buildMonthGrid(month, locale), [month, locale])

  const weekDayNames = useMemo(() => {
    if (grid.length === 0) return []
    return grid[0].map(cell =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
        new Date(cell.date.year, cell.date.month - 1, cell.date.day)
      )
    )
  }, [grid, locale])

  // Notify parent of event IDs in the current month so it can trigger enrichment loading
  const monthEventIds = useMemo(() => {
    const monthDateKeys = new Set(
      grid.flat().filter(c => c.isCurrentMonth).map(c => c.dateKey)
    )
    const ids: string[] = []
    byDate.forEach((items, dateKey) => {
      if (monthDateKeys.has(dateKey)) {
        items.forEach(item => ids.push(item.eventId))
      }
    })
    return ids
  }, [grid, byDate])

  useEffect(() => {
    onMonthEventIds?.(monthEventIds)
  }, [monthEventIds, onMonthEventIds])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM, paddingBottom: SPACING.MD }}>
      {/* Navigation header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
        <ActionButton isQuiet aria-label="Previous month" onPress={() => setMonth(m => prevMonth(m))}>
          <ChevronLeft />
        </ActionButton>
        <ActionButton isQuiet aria-label="Next month" onPress={() => setMonth(m => nextMonth(m))}>
          <ChevronRight />
        </ActionButton>
        <Button
          variant="secondary"
          fillStyle="outline"
          onPress={() => setMonth(currentMonthStart())}
        >
          <Text>Today</Text>
        </Button>
        <Heading level={3} UNSAFE_style={{ margin: 0 }}>
          {getMonthTitle(month, locale)}
        </Heading>
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          border: '1px solid var(--spectrum-global-color-gray-200)',
          borderRight: 'none',
          borderBottom: 'none',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        {/* Weekday header row */}
        {weekDayNames.map((name, i) => (
          <div
            key={i}
            style={{
              padding: '6px 8px',
              backgroundColor: 'var(--spectrum-global-color-gray-200)',
              borderRight: '1px solid var(--spectrum-global-color-gray-200)',
              borderBottom: '1px solid var(--spectrum-global-color-gray-200)',
              textAlign: 'center',
            }}
          >
            <Text
              UNSAFE_style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--spectrum-global-color-gray-700)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {name}
            </Text>
          </div>
        ))}

        {/* Day cells */}
        {grid.flat().map(cell => {
          const cellEvents = byDate.get(cell.dateKey) || []
          return (
            <DayCell
              key={cell.dateKey}
              dateKey={cell.dateKey}
              dayNumber={cell.date.day}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={cell.isToday}
              events={cellEvents}
              maxChips={maxChipsPerDay}
              thumbnails={thumbnails}
              loadingThumbnails={loadingThumbnails}
              renderEventPopover={renderEventPopover}
            />
          )
        })}
      </div>

      {/* Undated events notice */}
      {undated.length > 0 && (
        <div
          style={{
            padding: `${SPACING.SM}px ${SPACING.MD}px`,
            backgroundColor: 'var(--spectrum-global-color-yellow-100)',
            borderRadius: 4,
            border: '1px solid var(--spectrum-global-color-yellow-400)',
          }}
        >
          <Text UNSAFE_style={{ fontSize: '13px', color: 'var(--spectrum-global-color-gray-800)' }}>
            <strong>{undated.length}</strong>{' '}
            {undated.length === 1 ? 'event is' : 'events are'} missing a start date and
            {' '}cannot be placed on the calendar.
          </Text>
        </div>
      )}
    </div>
  )
}
