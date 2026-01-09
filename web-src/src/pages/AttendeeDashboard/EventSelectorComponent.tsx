/* 
* <license header>
*/

import React, { useMemo, useState } from 'react'
import {
  View,
  ComboBox,
  Item,
  Text
} from '@adobe/react-spectrum'
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
    <View width="100%">
      <ComboBox
        label={label}
        selectedKey={selectedEventId || null}
        onSelectionChange={handleSelectionChange}
        onInputChange={handleInputChange}
        isDisabled={isLoading || events.length === 0}
        width="100%"
        items={filteredItems}
        menuTrigger="input"
        allowsCustomValue={false}
      >
        {(item) => (
          <Item key={item.id} textValue={`${item.name} ${item.date}`}>
            <Text>{item.name}</Text>
            <Text slot="description">{item.date}</Text>
          </Item>
        )}
      </ComboBox>
    </View>
  )
}

export default EventSelectorComponent

