/* 
* <license header>
*/

import React, { useMemo } from 'react'
import { Text } from '@react-spectrum/s2'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { DataTable, TableColumn } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'
import PeopleGroup from '@react-spectrum/s2/icons/PeopleGroup';

interface AttendeeTableComponentProps {
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onAttendeeAction?: (action: 'view' | 'edit' | 'delete', attendee: Attendee) => void
  emptyMessage?: string
}

/**
 * Convert camelCase to Sentence Case for display
 */
function camelToSentenceCase(str: string): string {
  const result = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

/**
 * Empty state component for when no attendees are found
 */
const EmptyAttendeeState: React.FC<{ message: string }> = ({ message }) => {
  const isFiltered = message.toLowerCase().includes('search') || message.toLowerCase().includes('filter')
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center'
    }}>      
      {/* Heading */}
      <h2 style={{ fontSize: '28px', fontWeight: 700, color: COLORS.BLACK, marginBottom: '16px' }}>
        No attendees found for this event
      </h2>
      
      {/* Subtext */}
      <Text UNSAFE_style={{
        fontSize: '16px',
        color: COLORS.GRAY_700,
        maxWidth: '400px'
      }}>
        {isFiltered 
          ? 'Try choosing a different event or adjusting your search text.'
          : 'No attendees have registered for this event yet.'}
      </Text>
    </div>
  )
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
      return attendee.checkedIn ? 'yes' : 'no'
    
    case 'registrationStatus':
      return attendee.registrationStatus || fallback || 'registered'
    
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
  emptyMessage = 'No attendees found'
}) => {
  // Build columns from config
  const columns = useMemo<TableColumn<Attendee>[]>(() => {
    // Separate regular and sticky columns
    const regularCols = columnConfig.filter(c => !c.isSticky)
    const stickyCols = columnConfig.filter(c => c.isSticky)
    
    const buildColumn = (config: AttendeeColumnConfig): TableColumn<Attendee> => ({
      key: config.key,
      name: camelToSentenceCase(config.key).toUpperCase(),
      width: config.width || 150,
      sortable: config.sortable !== false,
      render: (item) => renderCellValue(item, config),
      isSticky: config.isSticky
    })

    return [
      ...regularCols.map(c => buildColumn(c)),
      ...stickyCols.map((c) => buildColumn(c))
    ]
  }, [columnConfig])

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Data Table */}
      <DataTable
        columns={columns}
        data={attendees}
        actions={[]}
        getItemKey={(item) => item.attendeeId}
        pageSize={20}
        emptyState={<EmptyAttendeeState message={emptyMessage} />}
      />
    </div>
  )
}

export default AttendeeTableComponent

