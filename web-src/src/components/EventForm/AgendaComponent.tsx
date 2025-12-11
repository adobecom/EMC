/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  DatePicker,
  TimeField,
  Flex,
  Button,
  Switch,
  ActionButton,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { Time } from '@internationalized/date'
import { parseDateTime, CalendarDateTime } from '@internationalized/date'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import { v4 as uuidv4 } from 'uuid'
import { HeadingWithTooltip, RichTextEditor } from '../shared'
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

  const moveAgendaItem = (fromIndex: number, toIndex: number) => {
    const updated = [...agendaItems]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    updateFormData({ agendaItems: updated })
  }

  const handleShowAgendaPostEventChange = (value: boolean) => {
    updateFormData({ showAgendaPostEvent: value })
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-200">
      {/* Header with toggles */}
      <Flex direction="row" justifyContent="space-between" alignItems="flex-start">
        <HeadingWithTooltip 
          level={3}
          tooltip="What is happening at your event and when? You can also specify whether the agenda should be shown post-event."
        >
          Agenda
        </HeadingWithTooltip>
        
        <Flex direction="column" gap="size-100" alignItems="flex-end">
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

      {/* Agenda Items */}
      {agendaItems.length === 0 && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No agenda items added yet. Click "Add agenda item" to add one.</Text>
        </View>
      )}

      {agendaItems.map((item, index) => (
        <View 
          key={item.id} 
          padding="size-200" 
          borderWidth="thin" 
          borderColor="dark" 
          borderRadius="medium"
          position="relative"
        >
          {/* Header with drag handle and delete */}
          <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
            <Heading level={4}>Agenda Item {index + 1}</Heading>
            <Flex gap="size-100" alignItems="center">
              {!orderByTime && agendaItems.length > 1 && (
                <>
                  <ActionButton 
                    isQuiet
                    onPress={() => index > 0 && moveAgendaItem(index, index - 1)}
                    isDisabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </ActionButton>
                  <ActionButton 
                    isQuiet
                    onPress={() => index < agendaItems.length - 1 && moveAgendaItem(index, index + 1)}
                    isDisabled={index === agendaItems.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </ActionButton>
                </>
              )}
              <ActionButton 
                isQuiet
                onPress={() => removeAgendaItem(index)}
                aria-label="Delete"
              >
                <Delete />
              </ActionButton>
            </Flex>
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
              width="100%"
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
          </Flex>
        </View>
      ))}

      {/* Add Button */}
      <Button 
        variant="secondary" 
        onPress={addAgendaItem}
        width="100%"
        UNSAFE_style={{
          border: '2px dotted var(--spectrum-global-color-gray-500)',
          color: 'var(--spectrum-global-color-gray-700)',
          backgroundColor: 'transparent'
        }}
      >
        <Add />
        <Flex>Add agenda item</Flex>
      </Button>

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
