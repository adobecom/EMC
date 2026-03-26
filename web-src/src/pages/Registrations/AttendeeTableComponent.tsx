/* 
* <license header>
*/

import React, { useMemo } from 'react'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'
import { DataTable, TableColumn } from '../../components/shared'

interface AttendeeTableComponentProps {
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onAttendeeAction?: (action: 'view' | 'edit' | 'delete', attendee: Attendee) => void
  /** Centered IllustratedMessage empty state (built by parent for correct title/copy/illustration) */
  emptyState: React.ReactNode
}

/**
 * Convert camelCase to Sentence Case for display
 */
function camelToSentenceCase(str: string): string {
  const result = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return result.charAt(0).toUpperCase() + result.slice(1)
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
  emptyState,
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
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <DataTable
        columns={columns}
        data={attendees}
        actions={[]}
        getItemKey={(item) => item.attendeeId}
        pageSize={20}
        emptyState={emptyState}
      />
    </div>
  )
}

export default AttendeeTableComponent
