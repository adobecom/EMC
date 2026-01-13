/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Item
} from '@adobe/react-spectrum'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { EventApiResponse } from '../../types/domain'
import type { Attendee, AttendeeStats } from '../../types/attendee'
import type { Campaign } from '../../types/campaign'
import { calculateAttendeeStats } from '../../types/attendee'
import { apiService } from '../../services/api'
import { useRsvpConfig } from '../../hooks/useRsvpConfig'
import { IMS } from '../../types'
import { LoadingSpinner } from '../../components/shared'
import { EventInfoComponent } from './EventInfoComponent'
import { EventSelectorComponent } from './EventSelectorComponent'
import { RegistrationsTab } from './RegistrationsTab'
import { CampaignsTab } from './CampaignsTab'

interface RegistrationsProps {
  ims: IMS
}

/**
 * Registrations Dashboard - Main container component with tabbed interface
 * 
 * Features:
 * - Event selection with searchable picker
 * - Event info panel with statistics
 * - Tabbed interface for Registrations and Campaigns
 */
export const Registrations: React.FC<RegistrationsProps> = ({ ims: _ims }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Determine initial event ID from URL params or query string
  const initialEventId = paramEventId || searchParams.get('eventId') || ''

  // State
  const [events, setEvents] = useState<EventApiResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedTab, setSelectedTab] = useState<React.Key>('registrations')
  
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

  // Load campaigns when event changes (mock data for now)
  useEffect(() => {
    if (!selectedEventId) {
      setCampaigns([])
      return
    }

    // Mock campaigns for frontend development
    // TODO: Replace with actual API call when backend is ready
    const mockCampaigns: Campaign[] = [
      {
        campaignId: 'campaign-1',
        eventId: selectedEventId,
        name: 'Partner Promotion',
        urlParam: 'partner-promo',
        capacityLimit: 50,
        registrationCount: 23,
        isActive: true,
        creationTime: Date.now() - 86400000 * 7,
        modificationTime: Date.now() - 86400000 * 2,
        createdBy: 'admin@adobe.com'
      },
      {
        campaignId: 'campaign-2',
        eventId: selectedEventId,
        name: 'Email Newsletter',
        urlParam: 'email-newsletter',
        capacityLimit: 100,
        registrationCount: 67,
        isActive: true,
        creationTime: Date.now() - 86400000 * 14,
        modificationTime: Date.now() - 86400000 * 1,
        createdBy: 'marketing@adobe.com'
      },
      {
        campaignId: 'campaign-3',
        eventId: selectedEventId,
        name: 'Social Media',
        urlParam: 'social',
        registrationCount: 45,
        isActive: false,
        creationTime: Date.now() - 86400000 * 21,
        modificationTime: Date.now() - 86400000 * 5,
        createdBy: 'social@adobe.com'
      }
    ]
    setCampaigns(mockCampaigns)
  }, [selectedEventId])

  // Calculate statistics from ALL attendees
  const stats: AttendeeStats = useMemo(() => 
    calculateAttendeeStats(attendees),
    [attendees]
  )

  // Handle event selection change
  const handleEventChange = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
    // Update URL without full navigation
    navigate(`/registrations/${eventId}`, { replace: true })
  }, [navigate])

  // Handle back navigation
  const handleBackClick = useCallback(() => {
    navigate('/events')
  }, [navigate])

  // Handle campaign update
  const handleCampaignsChange = useCallback((updatedCampaigns: Campaign[]) => {
    setCampaigns(updatedCampaigns)
  }, [])

  // Handle attendee list refresh
  const handleAttendeesRefresh = useCallback(async () => {
    if (!selectedEventId) return
    
    setIsLoadingAttendees(true)
    try {
      const result = await apiService.getAllEventAttendees(selectedEventId)
      if (!('error' in result)) {
        setAttendees(result.map(a => ({ ...a, eventId: selectedEventId })))
      }
    } catch (err) {
      console.error('Failed to refresh attendees:', err)
    } finally {
      setIsLoadingAttendees(false)
    }
  }, [selectedEventId])

  // Loading state
  if (isLoadingEvents) {
    return (
      <View padding="size-400">
        <LoadingSpinner message="Loading events..." />
      </View>
    )
  }

  return (
    <View width="100%" padding="size-400" UNSAFE_style={{ boxSizing: 'border-box' }}>
      {/* Header with Back Button and Event Selector */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--spectrum-global-color-gray-300)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--spectrum-global-color-gray-800)'
          }}
        >
          <span style={{ fontSize: '14px' }}>←</span>
          <span>Back</span>
        </button>

        {/* Page Title */}
        <Heading level={1} UNSAFE_style={{ margin: 0, flex: 1 }}>Event report</Heading>

        {/* Event Selector */}
        <div style={{ width: '280px' }}>
          <EventSelectorComponent
            events={events}
            selectedEventId={selectedEventId}
            onChange={handleEventChange}
            isLoading={isLoadingEvents}
            label="Search other events"
          />
        </div>
      </div>

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

      {/* Tabbed Content Area */}
      <View marginTop="size-200">
        <Tabs
          aria-label="Registrations Dashboard"
          selectedKey={selectedTab}
          onSelectionChange={setSelectedTab}
        >
          <TabList>
            <Item key="registrations">Registrations</Item>
            <Item key="campaigns">Campaigns</Item>
          </TabList>
          <TabPanels>
            <Item key="registrations">
              <View paddingTop="size-300">
                <RegistrationsTab
                  selectedEventId={selectedEventId}
                  attendees={attendees}
                  columnConfig={columnConfig}
                  isLoadingAttendees={isLoadingAttendees}
                  isLoadingConfig={isLoadingConfig}
                  onAttendeesRefresh={handleAttendeesRefresh}
                />
              </View>
            </Item>
            <Item key="campaigns">
              <View paddingTop="size-300">
                <CampaignsTab
                  eventId={selectedEventId}
                  event={selectedEvent}
                  campaigns={campaigns}
                  onCampaignsChange={handleCampaignsChange}
                />
              </View>
            </Item>
          </TabPanels>
        </Tabs>
      </View>
    </View>
  )
}

export default Registrations
