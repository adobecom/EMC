/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  DatePicker,
  TimeField,
  Flex,
  Switch,
  ActionButton,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { Button, Text as S2Text, TextField } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { Time } from '@internationalized/date'
import { parseDateTime, CalendarDateTime } from '@internationalized/date'
import Add from "@react-spectrum/s2/icons/Add"
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import Remove from '@spectrum-icons/workflow/Remove'
import DragHandle from '@spectrum-icons/workflow/DragHandle'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'
// @ts-ignore - uuid types not installed
import { v4 as uuidv4 } from 'uuid'
import { HeadingWithTooltip, RichTextEditor } from '../../components/shared'
import { AgendaItem } from '../../types/domain'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * Safely parse ISO 8601 datetime string for DatePicker
 */
function safeParseDateTimeString(dateString: string | undefined | null): CalendarDateTime | null {
  if (!dateString) return null
  
  try {
    const cleaned = dateString
      .replace(/\.\d{3}Z?$/, '')
      .replace(/[+-]\d{2}:\d{2}$/, '')
      .replace(/Z$/, '')
    
    return parseDateTime(cleaned)
  } catch (error) {
    console.error('Failed to parse datetime:', dateString, error)
    return null
  }
}

/**
 * Add minutes to a CalendarDateTime
 * Returns a new CalendarDateTime with the added minutes
 */
function addMinutes(dt: CalendarDateTime, minutes: number): CalendarDateTime {
  let newMinute = dt.minute + minutes
  let newHour = dt.hour
  let newDay = dt.day
  let newMonth = dt.month
  let newYear = dt.year
  
  // Handle minute overflow
  while (newMinute >= 60) {
    newMinute -= 60
    newHour += 1
  }
  while (newMinute < 0) {
    newMinute += 60
    newHour -= 1
  }
  
  // Handle hour overflow
  while (newHour >= 24) {
    newHour -= 24
    newDay += 1
  }
  while (newHour < 0) {
    newHour += 24
    newDay -= 1
  }
  
  // For simplicity, handle day overflow approximately (doesn't need to be perfect for +1 minute)
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  // Adjust for leap years
  if ((newYear % 4 === 0 && newYear % 100 !== 0) || newYear % 400 === 0) {
    daysInMonth[2] = 29
  }
  
  while (newDay > daysInMonth[newMonth]) {
    newDay -= daysInMonth[newMonth]
    newMonth += 1
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
  }
  
  return new CalendarDateTime(newYear, newMonth, newDay, newHour, newMinute, dt.second || 0)
}

/**
 * Get minimum end datetime (start + 1 minute) to ensure positive duration
 */
function getMinEndDateTime(startDateTimeStr: string | undefined): CalendarDateTime | undefined {
  if (!startDateTimeStr) return undefined
  const startDt = safeParseDateTimeString(startDateTimeStr)
  if (!startDt) return undefined
  return addMinutes(startDt, 1)
}

/**
 * Check if two datetime strings represent the same calendar day
 */
function isSameDay(dateStr1: string | undefined, dateStr2: string | undefined): boolean {
  if (!dateStr1 || !dateStr2) return false
  const dt1 = safeParseDateTimeString(dateStr1)
  const dt2 = safeParseDateTimeString(dateStr2)
  if (!dt1 || !dt2) return false
  return dt1.year === dt2.year && dt1.month === dt2.month && dt1.day === dt2.day
}

/**
 * Parse time from datetime string for TimeField
 */
function parseTimeFromDateTime(dateTimeStr: string | undefined): Time | null {
  if (!dateTimeStr) return null
  const dt = safeParseDateTimeString(dateTimeStr)
  if (!dt) return null
  return new Time(dt.hour, dt.minute, dt.second || 0)
}

/**
 * Get the min time value for TimeField (start + 1 minute)
 */
function getMinEndTime(startDateTimeStr: string | undefined): Time | undefined {
  if (!startDateTimeStr) return undefined
  const dt = safeParseDateTimeString(startDateTimeStr)
  if (!dt) return undefined
  // Add 1 minute
  let minute = dt.minute + 1
  let hour = dt.hour
  if (minute >= 60) {
    minute = 0
    hour = (hour + 1) % 24
  }
  return new Time(hour, minute, 0)
}

/**
 * Convert Time to ISO datetime string using the event's base date
 */
function timeToDateTimeString(time: Time | null, baseDateTimeStr: string | undefined): string {
  if (!time || !baseDateTimeStr) return ''
  const baseDate = safeParseDateTimeString(baseDateTimeStr)
  if (!baseDate) return ''
  
  const newDt = new CalendarDateTime(
    baseDate.year,
    baseDate.month,
    baseDate.day,
    time.hour,
    time.minute,
    time.second || 0
  )
  return newDt.toString()
}

/**
 * AgendaComponent - Manages event agenda items
 * 
 * Uses EventFormContext for state management.
 * Handles agenda items and showAgendaPostEvent flag.
 */
export const AgendaComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'agenda',
  })
  
  const agendaItems = formData.agendaItems || []
  const showAgendaPostEvent = formData.showAgendaPostEvent || false
  const eventStartDateTime = formData.startDateTime
  const eventEndDateTime = formData.endDateTime
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [orderByTime, setOrderByTime] = useState(false)
  // By default, agenda items are constrained to the event date/time window
  const [allowDatesOutsideEvent, setAllowDatesOutsideEvent] = useState(false)
  // Collapsed state per item (true = collapsed, showing only summary)
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(new Set())
  // Editing state per item (true = expanded for editing)
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set())
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Computed: is clamping active (default true unless user opts out)
  const isClampingActive = !allowDatesOutsideEvent && eventStartDateTime && eventEndDateTime
  
  // Computed: is the event a single-day event?
  const isSameDayEvent = isSameDay(eventStartDateTime, eventEndDateTime)

  // Auto-sort when orderByTime is enabled
  useEffect(() => {
    if (orderByTime && agendaItems.length > 0) {
      const allHaveStartTime = agendaItems.every(item => item.startDateTime)
      if (allHaveStartTime) {
        const sorted = [...agendaItems].sort((a, b) => 
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        )
        const orderChanged = sorted.some((item, idx) => item.id !== agendaItems[idx].id)
        if (orderChanged) {
          updateFormData({ agendaItems: sorted })
        }
      }
    }
  }, [orderByTime, agendaItems])
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const addAgendaItem = () => {
    const newItem: AgendaItem = {
      id: uuidv4(),
      startDateTime: '',
      endDateTime: '',
      title: '',
      description: ''
    }
    updateFormData({ agendaItems: [...agendaItems, newItem] })
  }

  const updateAgendaItem = (index: number, updates: Partial<AgendaItem>) => {
    const updated = [...agendaItems]
    updated[index] = { ...updated[index], ...updates }
    updateFormData({ agendaItems: updated })
  }

  const removeAgendaItem = (index: number) => {
    updateFormData({ agendaItems: agendaItems.filter((_, i) => i !== index) })
  }

  const handleShowAgendaPostEventChange = (value: boolean) => {
    updateFormData({ showAgendaPostEvent: value })
  }

  const handleToggleCollapse = (index: number) => {
    setCollapsedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
    // Exit editing mode when collapsing
    setEditingIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  const handleToggleEdit = (index: number) => {
    setEditingIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
    // Expand when entering edit mode
    setCollapsedIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (orderByTime) return // Disable drag when auto-ordering by time
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (orderByTime) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (orderByTime || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder the agenda items array
    const newItems = [...agendaItems]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    
    updateFormData({ agendaItems: newItems })
    
    // Update collapsed/editing indices to follow the items
    const updateIndices = (prev: Set<number>) => {
      const newSet = new Set<number>()
      prev.forEach(oldIndex => {
        if (oldIndex === draggedIndex) {
          newSet.add(dropIndex)
        } else if (draggedIndex < dropIndex) {
          if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
            newSet.add(oldIndex - 1)
          } else {
            newSet.add(oldIndex)
          }
        } else {
          if (oldIndex >= dropIndex && oldIndex < draggedIndex) {
            newSet.add(oldIndex + 1)
          } else {
            newSet.add(oldIndex)
          }
        }
      })
      return newSet
    }
    
    setCollapsedIndices(updateIndices)
    setEditingIndices(updateIndices)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getDatePickerConstraints = () => {
    if (!isClampingActive) {
      return { minValue: undefined, maxValue: undefined }
    }
    return {
      minValue: safeParseDateTimeString(eventStartDateTime) || undefined,
      maxValue: safeParseDateTimeString(eventEndDateTime) || undefined
    }
  }

  const { minValue, maxValue } = getDatePickerConstraints()
  
  // Determine if we should show time-only pickers (when clamped and same-day event)
  const showTimeOnly = isClampingActive && isSameDayEvent

  /**
   * Format datetime string to display time (e.g., "1:00 PM")
   */
  const formatTimeDisplay = (dateTimeStr: string | undefined): string => {
    if (!dateTimeStr) return ''
    const dt = safeParseDateTimeString(dateTimeStr)
    if (!dt) return ''
    
    const hour12 = dt.hour % 12 || 12
    const ampm = dt.hour >= 12 ? 'PM' : 'AM'
    const minute = dt.minute.toString().padStart(2, '0')
    return `${hour12}:${minute} ${ampm}`
  }

  /**
   * Get time range display string (e.g., "1:00 PM - 2:00 PM")
   */
  const getTimeRangeDisplay = (item: AgendaItem): string => {
    const start = formatTimeDisplay(item.startDateTime)
    const end = formatTimeDisplay(item.endDateTime)
    if (start && end) {
      return `${start} - ${end}`
    } else if (start) {
      return start
    }
    return ''
  }

  /**
   * Strip HTML tags and truncate text for collapsed view
   */
  const truncateDescription = (html: string | undefined, maxLength: number = 80): string => {
    if (!html) return ''
    // Strip HTML tags
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  /**
   * Check if an item has content (time or title filled in)
   */
  const isItemComplete = (item: AgendaItem): boolean => {
    return !!(item.startDateTime && item.title)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-200">
      {/* Header with toggles */}
      <Flex direction="row" justifyContent="space-between" alignItems="start">
        <HeadingWithTooltip 
          level={3}
          tooltip="What is happening at your event and when? You can also specify whether the agenda should be shown post-event."
        >
          Agenda
        </HeadingWithTooltip>
        
        <Flex direction="column" gap="size-100" alignItems="end">
          <View UNSAFE_style={{ display: 'inline-block' }}>
            <Switch
              isSelected={orderByTime}
              onChange={setOrderByTime}
            >
              Order by time
            </Switch>
          </View>
          
          <View UNSAFE_style={{ display: 'inline-block' }}>
            <Switch
              isSelected={allowDatesOutsideEvent}
              onChange={setAllowDatesOutsideEvent}
              isDisabled={!eventStartDateTime || !eventEndDateTime}
            >
              Allow dates outside event window
            </Switch>
          </View>
        </Flex>
      </Flex>

      {/* Agenda Items - Empty State */}
      {agendaItems.length === 0 && (
        <View 
          padding="size-400" 
          backgroundColor="gray-100" 
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <Flex direction="column" alignItems="center" gap="size-200">
            <Text>Create a new time slot to add to your agenda</Text>
            <Button 
              variant="secondary" 
              onPress={addAgendaItem}
            >
              <Add />
              <S2Text>Add slot</S2Text>
            </Button>
          </Flex>
        </View>
      )}

      {agendaItems.map((item, index) => {
        const isCollapsed = collapsedIndices.has(index) && isItemComplete(item) && !editingIndices.has(index)
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index
        const timeRange = getTimeRangeDisplay(item)
        const truncatedDesc = truncateDescription(item.description)

        // ==================== COLLAPSED VIEW ====================
        if (isCollapsed) {
          return (
            <div 
              key={item.id}
              draggable={!orderByTime}
              onDragStart={(e: React.DragEvent) => handleDragStart(e, index)}
              onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e: React.DragEvent) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                padding: '16px 20px',
                border: isDragOver 
                  ? '2px solid var(--spectrum-global-color-blue-500)' 
                  : '1px solid var(--spectrum-global-color-gray-300)',
                borderRadius: '8px',
                backgroundColor: isDragging 
                  ? 'var(--spectrum-global-color-gray-100)' 
                  : 'white',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'default',
                transition: 'border-color 0.2s, background-color 0.2s'
              }}
            >
              <Flex gap="size-200">
                {/* Content area */}
                <div 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column', 
                    gap: '4px', 
                    flex: 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleToggleCollapse(index)}
                >
                  {/* Time range */}
                  {timeRange && (
                    <Text UNSAFE_style={{ 
                      fontSize: '13px', 
                      color: 'var(--spectrum-global-color-gray-700)'
                    }}>
                      {timeRange}
                    </Text>
                  )}
                  {/* Title */}
                  <Text UNSAFE_style={{ 
                    fontWeight: 'bold', 
                    fontSize: '16px',
                    color: 'var(--spectrum-global-color-gray-900)'
                  }}>
                    {item.title || 'Untitled'}
                  </Text>
                  {/* Truncated description */}
                  {truncatedDesc && (
                    <Text UNSAFE_style={{ 
                      fontSize: '14px', 
                      color: 'var(--spectrum-global-color-gray-700)'
                    }}>
                      {truncatedDesc}
                    </Text>
                  )}
                </div>

                {/* Action buttons */}
                <Flex gap="size-100" alignItems="center" UNSAFE_style={{ flexShrink: 0 }}>
                  <ActionButton 
                    onPress={() => removeAgendaItem(index)} 
                    isQuiet 
                    aria-label="Remove"
                  >
                    <Remove />
                  </ActionButton>
                  <ActionButton 
                    onPress={() => handleToggleEdit(index)} 
                    isQuiet 
                    aria-label="Edit"
                  >
                    <Edit />
                  </ActionButton>
                  {/* Drag Handle - only show when not auto-ordering */}
                  {!orderByTime && (
                    <DragHandle />
                  )}
                </Flex>
              </Flex>
            </div>
          )
        }

        // ==================== EXPANDED/EDIT VIEW ====================
        return (
          <div 
            key={item.id}
            onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e: React.DragEvent) => handleDrop(e, index)}
            style={{
              padding: '20px',
              border: isDragOver 
                ? '2px solid var(--spectrum-global-color-blue-500)' 
                : '1px solid var(--spectrum-global-color-gray-400)',
              borderRadius: '8px',
              transition: 'border-color 0.2s'
            }}
          >
            {/* Header with collapse toggle and delete */}
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
              <Flex alignItems="center" gap="size-100">
                {isItemComplete(item) && (
                  <ActionButton 
                    onPress={() => handleToggleCollapse(index)} 
                    isQuiet 
                    aria-label="Collapse"
                    UNSAFE_style={{ padding: 0 }}
                  >
                    <ChevronDown size="S" />
                  </ActionButton>
                )}
                <Heading level={4} UNSAFE_style={{ margin: 0 }}>
                  {item.title || `Agenda Item ${index + 1}`}
                </Heading>
              </Flex>
              <ActionButton 
                isQuiet
                onPress={() => removeAgendaItem(index)}
                aria-label="Delete"
              >
                <Delete />
              </ActionButton>
            </Flex>

            <Flex direction="column" gap="size-200">
              {/* Date/Time Row - shows TimeField only for same-day events when clamped */}
              <Flex direction="row" gap="size-200" wrap>
                {showTimeOnly ? (
                  <>
                    <TimeField
                      label="Start Time"
                      isRequired
                      granularity="minute"
                      value={parseTimeFromDateTime(item.startDateTime)}
                      onChange={(time) => updateAgendaItem(index, { 
                        startDateTime: timeToDateTimeString(time, eventStartDateTime) 
                      })}
                    />
                    <TimeField
                      label="End Time"
                      isRequired
                      granularity="minute"
                      value={parseTimeFromDateTime(item.endDateTime)}
                      onChange={(time) => updateAgendaItem(index, { 
                        endDateTime: timeToDateTimeString(time, eventStartDateTime) 
                      })}
                      minValue={getMinEndTime(item.startDateTime)}
                    />
                  </>
                ) : (
                  <>
                    <DatePicker
                      label="Start Date & Time"
                      isRequired
                      granularity="minute"
                      value={safeParseDateTimeString(item.startDateTime)}
                      onChange={(date) => updateAgendaItem(index, { startDateTime: date?.toString() || '' })}
                      minValue={minValue}
                      maxValue={maxValue}
                    />
                    <DatePicker
                      label="End Date & Time"
                      isRequired
                      granularity="minute"
                      value={safeParseDateTimeString(item.endDateTime)}
                      onChange={(date) => updateAgendaItem(index, { endDateTime: date?.toString() || '' })}
                      minValue={getMinEndDateTime(item.startDateTime) || minValue}
                      maxValue={maxValue}
                    />
                  </>
                )}
              </Flex>

              {/* Title */}
              <TextField
                label="Agenda Title"
                isRequired
                value={item.title}
                onChange={(value) => updateAgendaItem(index, { title: value })}
                styles={style({ width: '[100%]' })}
              />

              {/* Description */}
              <View width="100%">
                <RichTextEditor
                  label="Agenda Description"
                  value={item.description || ''}
                  onChange={(value) => updateAgendaItem(index, { description: value })}
                  height="200px"
                />
              </View>

              {/* Done button - collapse when complete */}
              {isItemComplete(item) && (
                <Flex justifyContent="end">
                  <Button 
                    variant="secondary" 
                    onPress={() => handleToggleCollapse(index)}
                  >
                    Done
                  </Button>
                </Flex>
              )}
            </Flex>
          </div>
        )
      })}

      {/* Add Button - only show when items exist */}
      {agendaItems.length > 0 && (
        <Button
          variant="secondary"
          onPress={addAgendaItem}
          styles={style({ width: '[100%]' })}
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-gray-200)',
            border: 'none',
            color: 'var(--spectrum-gray-800)',
            justifyContent: 'start',
            paddingLeft: 16,
          }}
        >
          <Add />
          <S2Text>Add another time slot</S2Text>
        </Button>
      )}

      {/* Show Agenda Post-Event Toggle */}
      <View UNSAFE_style={{ display: 'inline-block' }}>
        <Switch
          isSelected={showAgendaPostEvent}
          onChange={handleShowAgendaPostEventChange}
        >
          Show agenda post-event
        </Switch>
      </View>
    </Flex>
  )
}
