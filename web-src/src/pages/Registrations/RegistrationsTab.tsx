/* 
* <license header>
*/

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  SearchField,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import type { Attendee, AttendeeFilters, AttendeeColumnConfig } from '../../types/attendee'
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
  isLoadingAttendees: boolean
  isLoadingConfig: boolean
  onAttendeesRefresh: () => Promise<void>
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
  isLoadingAttendees,
  isLoadingConfig
}) => {
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
          {/* Search */}
          {selectedEventId && (
            <div style={{ 
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px'
            }}>
              <div style={{ width: '240px' }}>
                <SearchField
                  label="Search attendees"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  width="100%"
                  isQuiet
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
            isLoading={isLoadingAttendees || isLoadingConfig}
            emptyMessage={
              !selectedEventId 
                ? 'Select an event to view attendees'
                : searchQuery || Object.values(filters).some(v => v.length > 0)
                  ? 'No attendees match your search/filters'
                  : 'No attendees registered for this event'
            }
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Remove Attendee"
            variant="destructive"
            primaryActionLabel="Remove"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              if (itemToDelete) {
                handleDeleteAttendee(itemToDelete)
              }
              close()
            }}
            onSecondaryAction={close}
          >
            Are you sure you want to remove {itemToDelete ? getAttendeeName(itemToDelete) : 'this attendee'}? 
            This action cannot be undone.
          </AlertDialog>
        )}
      </DialogTrigger>
    </>
  )
}

export default RegistrationsTab
