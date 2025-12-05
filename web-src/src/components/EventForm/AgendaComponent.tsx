/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  DatePicker,
  Flex,
  Button,
  Switch,
  ActionButton,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { parseDateTime } from '@internationalized/date'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import { v4 as uuidv4 } from 'uuid'
import { HeadingWithTooltip, RichTextEditor } from '../shared'
import { AgendaItem } from '../../types/domain'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * Safely parse ISO 8601 datetime string for DatePicker
 */
function safeParseDateTimeString(dateString: string | undefined | null) {
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
  const [clampByEventDateTime, setClampByEventDateTime] = useState(false)

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
    if (!clampByEventDateTime) {
      return { minValue: undefined, maxValue: undefined }
    }
    return {
      minValue: safeParseDateTimeString(eventStartDateTime) || undefined,
      maxValue: safeParseDateTimeString(eventEndDateTime) || undefined
    }
  }

  const { minValue, maxValue } = getDatePickerConstraints()

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
              isSelected={clampByEventDateTime}
              onChange={setClampByEventDateTime}
              isDisabled={!eventStartDateTime || !eventEndDateTime}
            >
              Clamp by event date time
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
            {/* Date/Time Row */}
            <Flex direction="row" gap="size-200" wrap>
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
                minValue={safeParseDateTimeString(item.startDateTime) || minValue}
                maxValue={maxValue}
              />
            </Flex>

            {/* Title */}
            <TextField
              label="Agenda Title"
              isRequired
              isQuiet
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
