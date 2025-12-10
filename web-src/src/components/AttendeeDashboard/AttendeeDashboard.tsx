/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Flex,
  Heading,
  SearchField,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { EventApiResponse } from '../../types/domain'
import type { Attendee, AttendeeFilters, AttendeeStats } from '../../types/attendee'
import { calculateAttendeeStats, getAttendeeName } from '../../types/attendee'
import { apiService } from '../../services/api'
import { useRsvpConfig } from '../../hooks/useRsvpConfig'
import { IMS } from '../../types'
import { LoadingSpinner } from '../shared'
import {
  EventSelectorComponent,
  EventInfoComponent,
  AttendeeFiltersComponent,
  AttendeeTableComponent,
  BulkActionsToolbar
} from './index'

interface AttendeeDashboardProps {
  ims: IMS
}

/**
 * Attendee Dashboard - Main container component
 * 
 * Features:
 * - Event selection with searchable picker
 * - Event info panel with statistics
 * - Dynamic columns from RSVP config
 * - Side panel with filters
 * - CSV export functionality
 * - Selection for bulk actions
 */
export const AttendeeDashboard: React.FC<AttendeeDashboardProps> = ({ ims: _ims }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Determine initial event ID from URL params or query string
  const initialEventId = paramEventId || searchParams.get('eventId') || ''

  // State
  const [events, setEvents] = useState<EventApiResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [filters, setFilters] = useState<AttendeeFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [itemToDelete, setItemToDelete] = useState<Attendee | null>(null)
  
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [, setError] = useState<string | null>(null)

  // Get selected event
  const selectedEvent = useMemo(() => 
    events.find(e => e.eventId === selectedEventId) || null,
    [events, selectedEventId]
  )

  // Get RSVP config for the selected event's cloud type
  const { columnConfig, isLoading: isLoadingConfig } = useRsvpConfig(selectedEvent?.cloudType)

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoadingEvents(true)
      try {
        const eventsData = await apiService.getEventsList()
        
        if (Array.isArray(eventsData)) {
          setEvents(eventsData)
          
          // If no event selected and we have events, select the first one
          if (!selectedEventId && eventsData.length > 0) {
            setSelectedEventId(eventsData[0].eventId)
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err)
        setError('Failed to load events')
      } finally {
        setIsLoadingEvents(false)
      }
    }

    loadEvents()
  }, [])

  // Load attendees when event changes
  useEffect(() => {
    if (!selectedEventId) {
      setAttendees([])
      return
    }

    const loadAttendees = async () => {
      setIsLoadingAttendees(true)
      setError(null)
      
      try {
        // Use getAllEventAttendees for paginated fetching
        const result = await apiService.getAllEventAttendees(selectedEventId)
        
        if ('error' in result) {
          console.error('Failed to load attendees:', result)
          setAttendees([])
          setError('Failed to load attendees')
          return
        }
        
        // Add eventId to each attendee for reference
        const attendeesWithEventId = result.map(a => ({
          ...a,
          eventId: selectedEventId
        }))
        
        setAttendees(attendeesWithEventId)
        
        // Clear selection when event changes
        setSelectedIds(new Set())
        
        // Clear filters when event changes
        setFilters({})
        
      } catch (err) {
        console.error('Failed to load attendees:', err)
        setAttendees([])
        setError('Failed to load attendees')
      } finally {
        setIsLoadingAttendees(false)
      }
    }

    loadAttendees()
  }, [selectedEventId])

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

  // Calculate statistics
  const stats: AttendeeStats = useMemo(() => 
    calculateAttendeeStats(filteredAttendees),
    [filteredAttendees]
  )

  // Handle event selection change
  const handleEventChange = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
    // Update URL without full navigation
    navigate(`/attendees/${eventId}`, { replace: true })
  }, [navigate])

  // Handle delete attendee
  const handleDeleteAttendee = useCallback(async (attendee: Attendee) => {
    try {
      await apiService.removeAttendeeFromEvent(attendee.eventId!, attendee.attendeeId)
      setItemToDelete(null)
      
      // Refresh attendees
      const result = await apiService.getAllEventAttendees(selectedEventId)
      if (!('error' in result)) {
        setAttendees(result.map(a => ({ ...a, eventId: selectedEventId })))
      }
    } catch (err) {
      console.error('Failed to delete attendee:', err)
    }
  }, [selectedEventId])

  // Handle attendee action (delete)
  const handleAttendeeAction = useCallback((action: 'view' | 'edit' | 'delete', attendee: Attendee) => {
    if (action === 'delete') {
      setItemToDelete(attendee)
    }
  }, [])

  // Handle back navigation
  const handleBackClick = useCallback(() => {
    navigate('/events')
  }, [navigate])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Loading state
  if (isLoadingEvents) {
    return (
      <View padding="size-400">
        <LoadingSpinner message="Loading events..." />
      </View>
    )
  }

  return (
    <View width="100%" padding="size-400">
      {/* Header */}
      <Flex direction="row" justifyContent="space-between" alignItems="center" marginBottom="size-300">
        <Heading level={1}>Attendee Management</Heading>
      </Flex>

      {/* Event Selector */}
      <View marginBottom="size-300">
        <EventSelectorComponent
          events={events}
          selectedEventId={selectedEventId}
          onChange={handleEventChange}
          isLoading={isLoadingEvents}
        />
      </View>

      {/* Event Info Panel */}
      {selectedEvent && (
        <View marginBottom="size-300">
          <EventInfoComponent
            event={selectedEvent}
            stats={stats}
            isLoading={isLoadingAttendees}
          />
        </View>
      )}

      {/* Main Content Area */}
      <Flex direction="row" gap="size-300">
        {/* Side Panel - Filters */}
        {selectedEventId && attendees.length > 0 && (
          <AttendeeFiltersComponent
            columnConfig={columnConfig}
            attendees={attendees}
            filters={filters}
            onFiltersChange={setFilters}
            onBackClick={handleBackClick}
            backLabel="Back to Events"
          />
        )}

        {/* Main Table Area */}
        <View flex={1}>
          {/* Search and Bulk Actions */}
          {selectedEventId && (
            <>
              <Flex direction="row" gap="size-200" marginBottom="size-200" alignItems="end">
                <View flex={1}>
                  <SearchField
                    label="Search attendees"
                    placeholder="Search by name, email, company..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                    width="100%"
                  />
                </View>
              </Flex>

              <BulkActionsToolbar
                selectedCount={selectedIds.size}
                totalCount={filteredAttendees.length}
                attendees={filteredAttendees}
                selectedIds={selectedIds}
                columnConfig={columnConfig}
                eventId={selectedEventId}
                onClearSelection={handleClearSelection}
              />
            </>
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
        </View>
      </Flex>

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
    </View>
  )
}

export default AttendeeDashboard

