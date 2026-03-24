/* 
* <license header>
*/

import React, { useMemo } from 'react'
import {
  View,
  Heading
} from '@adobe/react-spectrum'
import { Text } from '@react-spectrum/s2'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { DataTable, TableColumn } from '../../components/shared'
import { COLORS } from '../../styles/designSystem'

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
      {/* Icon - Document/List Icon */}
      <div style={{
        marginBottom: '32px'
      }}>
        <svg width="264" height="200" viewBox="0 0 264 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="70" y="20" width="124" height="160" rx="8" stroke={COLORS.GRAY_400} strokeWidth="4" fill="none"/>
          <circle cx="90" cy="60" r="8" stroke={COLORS.GRAY_400} strokeWidth="3" fill="none"/>
          <line x1="106" y1="60" x2="160" y2="60" stroke={COLORS.GRAY_400} strokeWidth="3" strokeLinecap="round"/>
          <circle cx="90" cy="90" r="8" stroke={COLORS.GRAY_400} strokeWidth="3" fill="none"/>
          <line x1="106" y1="90" x2="160" y2="90" stroke={COLORS.GRAY_400} strokeWidth="3" strokeLinecap="round"/>
          <circle cx="90" cy="120" r="8" stroke={COLORS.GRAY_400} strokeWidth="3" fill="none"/>
          <line x1="106" y1="120" x2="160" y2="120" stroke={COLORS.GRAY_400} strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
      
      {/* Heading */}
      <Heading level={2} UNSAFE_style={{ 
        fontSize: '28px',
        fontWeight: 700,
        color: COLORS.BLACK,
        marginBottom: '16px'
      }}>
        No attendees found for this event
      </Heading>
      
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
    <View width="100%" UNSAFE_style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Data Table */}
      <DataTable
        columns={columns}
        data={attendees}
        actions={[]}
        getItemKey={(item) => item.attendeeId}
        pageSize={20}
        emptyState={<EmptyAttendeeState message={emptyMessage} />}
      />
    </View>
  )
}

export default AttendeeTableComponent

