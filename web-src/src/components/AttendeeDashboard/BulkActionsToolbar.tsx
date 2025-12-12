/* 
* <license header>
*/

import React, { useCallback } from 'react'
import {
  View,
  Flex,
  Button,
  Text,
  ActionButton
} from '@adobe/react-spectrum'
import Download from '@spectrum-icons/workflow/Download'
import Close from '@spectrum-icons/workflow/Close'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import { getAttendeeName } from '../../types/attendee'

interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  attendees: Attendee[]
  selectedIds: Set<string>
  columnConfig: AttendeeColumnConfig[]
  eventId: string
  onClearSelection: () => void
}

/**
 * Download CSV file
 */
function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return ''
  
  const str = String(value)
  
  // If the value contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Escape quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}

/**
 * Bulk actions toolbar with CSV export
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  attendees,
  selectedIds,
  columnConfig,
  eventId,
  onClearSelection
}) => {
  // Export to CSV
  const handleExportCsv = useCallback(() => {
    // Determine which attendees to export
    const dataToExport = selectedIds.size > 0
      ? attendees.filter(a => selectedIds.has(a.attendeeId))
      : attendees

    if (dataToExport.length === 0) {
      console.warn('No data to export')
      return
    }

    // Build headers from column config
    const headers = columnConfig.map(c => c.label)

    // Build rows
    const rows = dataToExport.map(attendee => {
      return columnConfig.map(config => {
        const { key } = config
        
        // Handle special fields
        if (key === 'name') {
          return escapeCsvValue(getAttendeeName(attendee))
        }
        
        if (key === 'checkedIn') {
          return attendee.checkedIn ? 'Yes' : 'No'
        }
        
        if (key === 'creationTime' || key === 'modificationTime') {
          const timestamp = attendee[key]
          if (timestamp) {
            return new Date(timestamp).toLocaleDateString()
          }
          return ''
        }
        
        const value = attendee[key]
        
        if (Array.isArray(value)) {
          return escapeCsvValue(value.join('; '))
        }
        
        return escapeCsvValue(value)
      })
    })

    // Combine into CSV content
    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `attendees-${eventId}-${timestamp}.csv`

    downloadCsv(csvContent, filename)
  }, [attendees, selectedIds, columnConfig, eventId])

  const exportLabel = selectedCount > 0 
    ? `Export ${selectedCount} Selected`
    : `Export All (${totalCount})`

  return (
    <View
      backgroundColor="gray-50"
      padding="size-150"
      borderRadius="medium"
      marginBottom="size-200"
    >
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        {/* Left side - selection info */}
        <Flex direction="row" gap="size-200" alignItems="center">
          {selectedCount > 0 ? (
            <>
              <Text UNSAFE_style={{ fontWeight: 600 }}>
                {selectedCount} attendee{selectedCount !== 1 ? 's' : ''} selected
              </Text>
              <ActionButton
                onPress={onClearSelection}
                isQuiet
              >
                <Close size="S" />
                <Text>Clear</Text>
              </ActionButton>
            </>
          ) : (
            <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
              {totalCount} total attendee{totalCount !== 1 ? 's' : ''}
            </Text>
          )}
        </Flex>

        {/* Right side - actions */}
        <Flex direction="row" gap="size-150">
          <Button
            variant="secondary"
            onPress={handleExportCsv}
            isDisabled={totalCount === 0}
          >
            <Download />
            <Text>{exportLabel}</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  )
}

export default BulkActionsToolbar

