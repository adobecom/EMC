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
  Heading
} from '@adobe/react-spectrum'
import { parseDateTime } from '@internationalized/date'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import { v4 as uuidv4 } from 'uuid'
import { HeadingWithTooltip, RichTextEditor } from '../shared'
import { AgendaItem } from '../../types/domain'

interface AgendaComponentProps {
  agendaItems: AgendaItem[]
  showAgendaPostEvent?: boolean
  eventStartDateTime?: string
  eventEndDateTime?: string
  onChange: (agendaItems: AgendaItem[]) => void
  onShowAgendaPostEventChange: (value: boolean) => void
}

export const AgendaComponent: React.FC<AgendaComponentProps> = ({
  agendaItems,
  showAgendaPostEvent = false,
  eventStartDateTime,
  eventEndDateTime,
  onChange,
  onShowAgendaPostEventChange
}) => {
  const [orderByTime, setOrderByTime] = useState(false)
  const [clampByEventDateTime, setClampByEventDateTime] = useState(false)

  // Auto-sort when orderByTime is enabled or when items change
  useEffect(() => {
    if (orderByTime && agendaItems.length > 0) {
      const allHaveStartTime = agendaItems.every(item => item.startDateTime)
      if (allHaveStartTime) {
        const sorted = [...agendaItems].sort((a, b) => 
          new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        )
        // Only update if order actually changed
        const orderChanged = sorted.some((item, idx) => item.id !== agendaItems[idx].id)
        if (orderChanged) {
          onChange(sorted)
        }
      }
    }
  }, [orderByTime, agendaItems])

  const addAgendaItem = () => {
    const newItem: AgendaItem = {
      id: uuidv4(),
      startDateTime: '',
      endDateTime: '',
      title: '',
      description: ''
    }
    onChange([...agendaItems, newItem])
  }

  const updateAgendaItem = (index: number, updates: Partial<AgendaItem>) => {
    const updated = [...agendaItems]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeAgendaItem = (index: number) => {
    onChange(agendaItems.filter((_, i) => i !== index))
  }

  const moveAgendaItem = (fromIndex: number, toIndex: number) => {
    const updated = [...agendaItems]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(updated)
  }

  // Calculate min/max values for date pickers when clamping is enabled
  const getDatePickerConstraints = () => {
    if (!clampByEventDateTime) {
      return { minValue: undefined, maxValue: undefined }
    }
    return {
      minValue: eventStartDateTime ? parseDateTime(eventStartDateTime) : undefined,
      maxValue: eventEndDateTime ? parseDateTime(eventEndDateTime) : undefined
    }
  }

  const { minValue, maxValue } = getDatePickerConstraints()

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
          <Heading level={4}>No agenda items yet</Heading>
          <Flex marginTop="size-100">Click "Add agenda item" to add one.</Flex>
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
                value={item.startDateTime ? parseDateTime(item.startDateTime) : null}
                onChange={(date) => updateAgendaItem(index, { startDateTime: date?.toString() || '' })}
                minValue={minValue}
                maxValue={maxValue}
              />

              <DatePicker
                label="End Date & Time"
                isRequired
                granularity="minute"
                value={item.endDateTime ? parseDateTime(item.endDateTime) : null}
                onChange={(date) => updateAgendaItem(index, { endDateTime: date?.toString() || '' })}
                minValue={item.startDateTime ? parseDateTime(item.startDateTime) : minValue}
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
          onChange={onShowAgendaPostEventChange}
        >
          Show agenda post-event
        </Switch>
      </View>
    </Flex>
  )
}

