/* 
* <license header>
*/

import React, { useState, useCallback, useMemo } from 'react'
import { DialogTrigger, SearchField, ActionButton, AlertDialog } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Download from '@react-spectrum/s2/icons/Download'
import CalendarIllustration from '@react-spectrum/s2/illustrations/linear/Calendar'
import NoSearchResults from '@react-spectrum/s2/illustrations/linear/NoSearchResults'
import UserGroupIllustration from '@react-spectrum/s2/illustrations/linear/UserGroup'
import { ResourceEmptyState } from '../../components/shared'
import type { Attendee, AttendeeFilters, AttendeeColumnConfig } from '../../types/attendee'
import type { Campaign } from '../../types/campaign'
import { useHasPermission } from '../../hooks/useHasPermission'
import { ExportDialog } from './ExportDialog'
import { getAttendeeName } from '../../types/attendee'
import { apiService } from '../../services/api'
import {
  AttendeeFiltersComponent,
  AttendeeTableComponent,
} from './index'

interface RegistrationsTabProps {
  selectedEventId: string
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  onAttendeesRefresh: () => Promise<void>
  campaigns?: Campaign[]
  eventTitle?: string
}

/**
 * Registrations Tab - Contains the attendee list and filters
 * 
 * Features:
 * - Dynamic columns from RSVP config
 * - Filters panel
 * - CSV export functionality
 * - Selection for bulk actions
 */
export const RegistrationsTab: React.FC<RegistrationsTabProps> = ({
  selectedEventId,
  attendees,
  columnConfig,
  campaigns = [],
  eventTitle = '',
}) => {
  const isAdmin = useHasPermission('user', 'read')
  const [isExportOpen, setIsExportOpen] = useState(false)

  // State
  const [filters, setFilters] = useState<AttendeeFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useState<Attendee | null>(null)

  // Filter and search attendees
  const filteredAttendees = useMemo(() => {
    let result = [...attendees]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(attendee => {
        // Search across key fields
        const searchableValues = [
          getAttendeeName(attendee),
          attendee.email,
          attendee.companyName,
          attendee.mobilePhone
        ]
        return searchableValues.some(v => 
          v && v.toLowerCase().includes(query)
        )
      })
    }

    // Apply filters
    const activeFilters = Object.entries(filters).filter(([, values]) => values.length > 0)
    
    if (activeFilters.length > 0) {
      result = result.filter(attendee => {
        return activeFilters.every(([fieldKey, allowedValues]) => {
          const value = attendee[fieldKey]
          if (value === null || value === undefined) return false
          return allowedValues.includes(String(value))
        })
      })
    }

    return result
  }, [attendees, searchQuery, filters])

  // Handle delete attendee
  const handleDeleteAttendee = useCallback(async (attendee: Attendee) => {
    try {
      await apiService.removeAttendeeFromEvent(attendee.eventId!, attendee.attendeeId)
      setItemToDelete(null)
      
    } catch (err) {
      console.error('Failed to delete attendee:', err)
    }
  }, [])

  // Handle attendee action (delete)
  const handleAttendeeAction = useCallback((action: 'view' | 'edit' | 'delete', attendee: Attendee) => {
    if (action === 'delete') {
      setItemToDelete(attendee)
    }
  }, [])

  // Reset filters when event changes
  React.useEffect(() => {
    setFilters({})
    setSelectedIds(new Set())
    setSearchQuery('')
  }, [selectedEventId])

  const hasActiveFilters =
    searchQuery.trim().length > 0 || Object.values(filters).some(v => v.length > 0)

  const attendeeEmptyState = useMemo(() => {
    if (!selectedEventId) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<CalendarIllustration aria-hidden />}
          title="Select an event"
          description="Choose an event to load registrations and manage attendees for that event."
        />
      )
    }
    if (hasActiveFilters && filteredAttendees.length === 0) {
      return (
        <ResourceEmptyState
          fillContainer
          illustration={<NoSearchResults aria-hidden />}
          title="No matching attendees"
          description="Try adjusting your search or filters, or pick another event."
        />
      )
    }
    return (
      <ResourceEmptyState
        fillContainer
        illustration={<UserGroupIllustration aria-hidden />}
        title="No attendees yet"
        description="No one has registered for this event yet. Registrations will appear here as people sign up."
      />
    )
  }, [selectedEventId, hasActiveFilters, filteredAttendees.length])

  return (
    <>
      {/* Main Content Area */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: selectedEventId && attendees.length > 0 ? '220px 1fr' : '1fr', 
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Filters Panel - Only show when there are attendees */}
        {selectedEventId && attendees.length > 0 && (
          <AttendeeFiltersComponent
            columnConfig={columnConfig}
            attendees={attendees}
            filters={filters}
            onFiltersChange={setFilters}
            backLabel=""
          />
        )}

        {/* Main Table Area */}
        <div style={{ minWidth: 0 }}>
          {/* Search + Export */}
          {selectedEventId && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              alignItems: 'flex-end',
              marginBottom: '16px'
            }}>
              {isAdmin && filteredAttendees.length > 0 && (
                <ActionButton data-testid="export-button" aria-label="Export attendees" onPress={() => setIsExportOpen(true)}>
                  <Download />
                </ActionButton>
              )}
              <div style={{ width: '240px' }}>
                <SearchField
                  label="Search attendees"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  styles={style({ width: '[100%]' })}
                />
              </div>
            </div>
          )}

          {/* Attendee Table */}
          <AttendeeTableComponent
            attendees={filteredAttendees}
            columnConfig={columnConfig}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onAttendeeAction={handleAttendeeAction}
            emptyState={attendeeEmptyState}
          />
        </div>
      </div>

      {/* Export Dialog */}
      <DialogTrigger isOpen={isExportOpen} onOpenChange={setIsExportOpen}>
        <div style={{ display: 'none' }} />
        <ExportDialog
          attendees={filteredAttendees}
          columnConfig={columnConfig}
          campaigns={campaigns}
          eventTitle={eventTitle}
          onClose={() => setIsExportOpen(false)}
        />
      </DialogTrigger>

      {/* Delete Confirmation Dialog */}
      <DialogTrigger isOpen={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Remove Attendee"
          variant="destructive"
          primaryActionLabel="Remove"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (itemToDelete) { handleDeleteAttendee(itemToDelete) }
          }}
          onCancel={() => setItemToDelete(null)}
        >
          Are you sure you want to remove {itemToDelete ? getAttendeeName(itemToDelete) : 'this attendee'}?
          This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>
    </>
  )
}

export default RegistrationsTab
