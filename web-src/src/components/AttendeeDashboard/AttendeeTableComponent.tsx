/* 
* <license header>
*/

import React, { useMemo } from 'react'
import {
  View,
  Flex,
  Text,
  Content,
  Checkbox
} from '@adobe/react-spectrum'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import { getAttendeeName, mapRegistrationStatusToDisplay } from '../../types/attendee'
import { DataTable, TableColumn, TableAction, StatusBadge, LoadingSpinner } from '../shared'

interface AttendeeTableComponentProps {
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onAttendeeAction?: (action: 'view' | 'edit' | 'delete', attendee: Attendee) => void
  isLoading?: boolean
  emptyMessage?: string
}

/**
 * Render cell value based on column config
 */
function renderCellValue(attendee: Attendee, config: AttendeeColumnConfig): React.ReactNode {
  const { key, fallback } = config
  
  switch (key) {
    case 'name':
      return getAttendeeName(attendee)
    
    case 'checkedIn':
      return attendee.checkedIn ? 'Yes' : 'No'
    
    case 'registrationStatus':
      return <StatusBadge status={mapRegistrationStatusToDisplay(attendee)} />
    
    case 'creationTime':
    case 'modificationTime':
      const timestamp = attendee[key]
      if (timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
      return fallback || '-'
    
    default:
      const value = attendee[key]
      if (value === null || value === undefined || value === '') {
        return fallback || '-'
      }
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return String(value)
  }
}

/**
 * Attendee table with dynamic columns from RSVP config
 */
export const AttendeeTableComponent: React.FC<AttendeeTableComponentProps> = ({
  attendees,
  columnConfig,
  selectedIds,
  onSelectionChange,
  onAttendeeAction,
  isLoading = false,
  emptyMessage = 'No attendees found'
}) => {
  // Build columns from config
  const columns = useMemo<TableColumn<Attendee>[]>(() => {
    // Separate regular and sticky columns
    const regularCols = columnConfig.filter(c => !c.isSticky)
    const stickyCols = columnConfig.filter(c => c.isSticky)
    
    const buildColumn = (config: AttendeeColumnConfig): TableColumn<Attendee> => ({
      key: config.key,
      name: config.label.toUpperCase(),
      width: config.width || 150,
      sortable: config.sortable !== false,
      render: (item) => renderCellValue(item, config)
    })

    return [
      ...regularCols.map(c => buildColumn(c)),
      ...stickyCols.map((c) => buildColumn(c))
    ]
  }, [columnConfig])

  // Build actions
  const actions = useMemo<TableAction<Attendee>[]>(() => {
    if (!onAttendeeAction) return []
    
    return [
      {
        icon: 'delete' as const,
        label: 'Remove',
        onAction: (item) => onAttendeeAction('delete', item)
      }
    ]
  }, [onAttendeeAction])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(attendees.map(a => a.attendeeId)))
    } else {
      onSelectionChange(new Set())
    }
  }

  const isAllSelected = attendees.length > 0 && selectedIds.size === attendees.length
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < attendees.length

  if (isLoading) {
    return <LoadingSpinner message="Loading attendees..." />
  }

  return (
    <View width="100%">
      {/* Selection Header */}
      {attendees.length > 0 && (
        <Flex 
          direction="row" 
          gap="size-200" 
          alignItems="center" 
          marginBottom="size-200"
          UNSAFE_style={{ padding: '8px 0' }}
        >
          <Checkbox
            isSelected={isAllSelected}
            isIndeterminate={isSomeSelected}
            onChange={handleSelectAll}
          >
            Select all
          </Checkbox>
          {selectedIds.size > 0 && (
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
              {selectedIds.size} of {attendees.length} selected
            </Text>
          )}
        </Flex>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={attendees}
        actions={actions}
        getItemKey={(item) => item.attendeeId}
        pageSize={20}
        emptyState={
          <Content>
            <Text>{emptyMessage}</Text>
          </Content>
        }
      />
    </View>
  )
}

export default AttendeeTableComponent

