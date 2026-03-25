/* 
* <license header>
*/

import React, { useMemo, useCallback } from 'react'
import { Button, Text, ActionButton, Checkbox, Divider } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import type { AttendeeColumnConfig, AttendeeFilters, Attendee, FilterMenuConfig } from '../../types/attendee'
import { COLORS } from '../../styles/designSystem'

interface AttendeeFiltersComponentProps {
  columnConfig: AttendeeColumnConfig[]
  attendees: Attendee[]
  filters: AttendeeFilters
  onFiltersChange: (filters: AttendeeFilters) => void
  onBackClick?: () => void
  backLabel?: string
}

/**
 * Convert camelCase to Sentence Case for display
 */
function camelToSentenceCase(str: string): string {
  const result = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

/**
 * Fields to exclude from filter generation
 */
const EXCLUDED_FILTER_FIELDS = ['firstName', 'lastName', 'name', 'email', 'attendeeId']

/**
 * Side panel with filter menus for attendee list
 */
export const AttendeeFiltersComponent: React.FC<AttendeeFiltersComponentProps> = ({
  columnConfig,
  attendees,
  filters,
  onFiltersChange,
  onBackClick,
  backLabel = 'Back'
}) => {
  // Build filter options from attendee data
  const filterMenus = useMemo<FilterMenuConfig[]>(() => {
    const menus: FilterMenuConfig[] = []

    columnConfig.forEach(({ key, label }) => {
      // Skip excluded fields
      if (EXCLUDED_FILTER_FIELDS.includes(key)) return

      // Get unique values for this field
      const uniqueValues = new Map<string, number>()
      
      attendees.forEach(attendee => {
        const value = attendee[key]
        if (value != null && value !== '') {
          const strValue = String(value)
          uniqueValues.set(strValue, (uniqueValues.get(strValue) || 0) + 1)
        }
      })

      // Only create filter menu if there are values
      if (uniqueValues.size > 0) {
        menus.push({
          key,
          label: label || camelToSentenceCase(key),
          options: Array.from(uniqueValues.entries())
            .map(([value, count]) => ({
              value,
              label: formatFilterValue(key, value),
              count
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        })
      }
    })

    return menus
  }, [columnConfig, attendees])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(values => values.length > 0)
  }, [filters])

  // Handle filter value toggle
  const handleFilterToggle = useCallback((fieldKey: string, value: string, checked: boolean) => {
    const currentValues = filters[fieldKey] || []
    
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value)

    onFiltersChange({
      ...filters,
      [fieldKey]: newValues
    })
  }, [filters, onFiltersChange])

  // Clear all filters
  const handleClearAll = useCallback(() => {
    const clearedFilters: AttendeeFilters = {}
    filterMenus.forEach(menu => {
      clearedFilters[menu.key] = []
    })
    onFiltersChange(clearedFilters)
  }, [filterMenus, onFiltersChange])

  return (
    <div style={{ backgroundColor: 'var(--spectrum-gray-100)', borderRadius: '8px', padding: '16px', minWidth: '200px', maxWidth: '220px', alignSelf: 'flex-start' }}>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        {/* Back Button */}
        {onBackClick && backLabel && (
          <>
            <ActionButton
              onPress={onBackClick}
              isQuiet
              UNSAFE_style={{ 
                justifyContent: 'flex-start',
                marginLeft: '-4px'
              }}
            >
              <ChevronLeft />
              <Text UNSAFE_style={{ fontWeight: 700 }}>{backLabel}</Text>
            </ActionButton>
            <Divider size="S" />
          </>
        )}

        {/* Clear All Button */}
        <Button
          variant="accent"
          onPress={handleClearAll}
          isDisabled={!hasActiveFilters}
          UNSAFE_style={{ width: '100%' }}
        >
          Clear all filters
        </Button>

        {/* Filter Menus */}
        {filterMenus.length === 0 ? (
          <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '14px' }}>
            No filters available
          </Text>
        ) : (
          filterMenus.map(menu => (
            <FilterMenu
              key={menu.key}
              menu={menu}
              selectedValues={filters[menu.key] || []}
              onToggle={(value, checked) => handleFilterToggle(menu.key, value, checked)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Individual filter menu component
 */
interface FilterMenuProps {
  menu: FilterMenuConfig
  selectedValues: string[]
  onToggle: (value: string, checked: boolean) => void
}

const FilterMenu: React.FC<FilterMenuProps> = ({ menu, selectedValues, onToggle }) => {
  const [isExpanded, setIsExpanded] = React.useState(true)

  return (
    <div>
      <ActionButton
        onPress={() => setIsExpanded(!isExpanded)}
        isQuiet
        UNSAFE_style={{
          width: '100%',
          justifyContent: 'space-between',
          paddingLeft: 0,
          paddingRight: 0
        }}
      >
        <Text UNSAFE_style={{ fontWeight: 600, fontSize: '12px' }}>
          {menu.label.toUpperCase()}
        </Text>
        <Text>{isExpanded ? '−' : '+'}</Text>
      </ActionButton>

      {isExpanded && (
        <div className={style({display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8})}>
          {menu.options.map(option => (
            <Checkbox
              key={option.value}
              isSelected={selectedValues.includes(option.value)}
              onChange={(checked) => onToggle(option.value, checked)}
            >
              <span style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                <Text UNSAFE_style={{ fontSize: '13px' }}>{option.label}</Text>
                {option.count !== undefined && (
                  <Text UNSAFE_style={{ fontSize: '11px', color: COLORS.GRAY_600 }}>
                    ({option.count})
                  </Text>
                )}
              </span>
            </Checkbox>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Format filter value for display
 */
function formatFilterValue(key: string, value: string): string {
  // Boolean fields
  if (key === 'checkedIn') {
    return value === 'true' ? 'Yes' : 'No'
  }
  
  // Registration status
  if (key === 'registrationStatus') {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  
  return value
}

export default AttendeeFiltersComponent

