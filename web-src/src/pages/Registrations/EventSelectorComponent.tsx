/* 
* <license header>
*/

import React, { useMemo, useState } from 'react'
import { ComboBox, ComboBoxItem, Text } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import type { EventApiResponse } from '../../types/domain'

interface EventSelectorComponentProps {
  events: EventApiResponse[]
  selectedEventId: string
  onChange: (eventId: string) => void
  isLoading?: boolean
  label?: string
}

/**
 * Format event date for display
 */
function formatEventDate(event: EventApiResponse): string {
  const dateStr = event.localStartDate || event.startDate
  if (!dateStr) return 'No date'
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Get display title for event
 */
function getEventTitle(event: EventApiResponse): string {
  return event.enTitle || event.title || event.eventId
}

/**
 * Searchable event selector component using ComboBox
 */
export const EventSelectorComponent: React.FC<EventSelectorComponentProps> = ({
  events,
  selectedEventId,
  onChange,
  isLoading = false,
  label = 'Select Event'
}) => {
  const [filterText, setFilterText] = useState('')

  // Create items with combined title and date for searching
  const eventItems = useMemo(() => {
    return events.map(event => ({
      id: event.eventId,
      name: getEventTitle(event),
      date: formatEventDate(event),
      searchText: `${getEventTitle(event)} ${formatEventDate(event)}`.toLowerCase()
    }))
  }, [events])

  // Filter items based on search text
  const filteredItems = useMemo(() => {
    if (!filterText) return eventItems
    
    const searchLower = filterText.toLowerCase()
    return eventItems.filter(item => 
      item.searchText.includes(searchLower)
    )
  }, [eventItems, filterText])

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      onChange(String(key))
      setFilterText('') // Clear filter after selection
    }
  }

  const handleInputChange = (value: string) => {
    setFilterText(value)
  }

  return (
    <div style={{ width: '100%' }}>
      <ComboBox
        label={label}
        selectedKey={selectedEventId || null}
        onSelectionChange={handleSelectionChange}
        onInputChange={handleInputChange}
        isDisabled={isLoading || events.length === 0}
        styles={style({ width: '[100%]' })}
        defaultItems={filteredItems}
        menuTrigger="input"
        allowsCustomValue={false}
      >
        {(item) => (
          <ComboBoxItem id={item.id} textValue={`${item.name} ${item.date}`}>
            <Text slot="label">{item.name}</Text>
            <Text slot="description">{item.date}</Text>
          </ComboBoxItem>
        )}
      </ComboBox>
    </div>
  )
}

export default EventSelectorComponent

