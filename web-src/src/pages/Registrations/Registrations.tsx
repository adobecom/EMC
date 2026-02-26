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
import type { Campaign, CampaignFormData, CampaignCreatePayload, CampaignUpdatePayload, CampaignListResponse } from '../../types/campaign'
import { calculateAttendeeStats } from '../../types/attendee'
import { apiService } from '../../services/api'
import { useRsvpConfig } from '../../hooks/useRsvpConfig'
import { IMS } from '../../types'
import { BlurredLoadingOverlay } from '../../components/shared'
import { useToast as useToastContext } from '../../contexts'
import { EventInfoComponent } from './EventInfoComponent'
import { EventSelectorComponent } from './EventSelectorComponent'
import { RegistrationsTab } from './RegistrationsTab'
import { CampaignsTab } from './CampaignsTab'

interface RegistrationsProps {
  ims: IMS
}

export const Registrations: React.FC<RegistrationsProps> = ({ ims: _ims }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToastContext()

  const initialEventId = paramEventId || searchParams.get('eventId') || ''

  // State
  const [events, setEvents] = useState<EventApiResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedTab, setSelectedTab] = useState<React.Key>('registrations')

  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [, setError] = useState<string | null>(null)

  const selectedEvent = useMemo(() =>
    events.find(e => e.eventId === selectedEventId) || null,
    [events, selectedEventId]
  )

  const { columnConfig, isLoading: isLoadingConfig } = useRsvpConfig(selectedEvent?.cloudType)

  // ---- Data loading ----

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoadingEvents(true)
      try {
        const eventsData = await apiService.getEventsList()

        if (Array.isArray(eventsData)) {
          setEvents(eventsData)

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

  const loadCampaigns = useCallback(async () => {
    if (!selectedEventId) {
      setCampaigns([])
      return
    }

    setIsLoadingCampaigns(true)
    try {
      const result = await apiService.getEventCampaigns(selectedEventId) as CampaignListResponse
      if ('error' in result) {
        console.error('Failed to load campaigns:', result)
        setCampaigns([])
        return
      }
      setCampaigns(result.campaigns || [])
    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setCampaigns([])
    } finally {
      setIsLoadingCampaigns(false)
    }
  }, [selectedEventId])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // ---- Statistics ----

  const stats: AttendeeStats = useMemo(() =>
    calculateAttendeeStats(attendees),
    [attendees]
  )

  // ---- Handlers ----

  const handleEventChange = useCallback((eventId: string) => {
    setSelectedEventId(eventId)
    navigate(`/registrations/${eventId}`, { replace: true })
  }, [navigate])

  const handleBackClick = useCallback(() => {
    navigate('/events')
  }, [navigate])

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

  const handleCreateCampaign = useCallback(async (formData: CampaignFormData) => {
    const payload: CampaignCreatePayload = {
      name: formData.name,
      status: formData.status,
      attendeeLimit: formData.attendeeLimit,
    }

    const result = await apiService.createCampaign(selectedEventId, payload as unknown as Record<string, unknown>)

    if ('error' in result) {
      toast.error(`Failed to create campaign: ${result.error}`)
      throw new Error(result.error)
    }

    toast.success('Campaign created')
    await loadCampaigns()
  }, [selectedEventId, loadCampaigns, toast])

  const handleUpdateCampaign = useCallback(async (
    campaignId: string,
    formData: CampaignFormData,
    modificationTime: number
  ) => {
    const payload: CampaignUpdatePayload = {
      name: formData.name,
      status: formData.status,
      modificationTime,
    }

    const result = await apiService.updateCampaign(
      selectedEventId,
      campaignId,
      payload as unknown as Record<string, unknown>
    )

    if ('error' in result) {
      const is409 = (result as any).status === 409
      if (is409) {
        toast.error('Campaign was modified by someone else. Please refresh and try again.')
        await loadCampaigns()
      } else {
        toast.error(`Failed to update campaign: ${result.error}`)
      }
      throw new Error(result.error)
    }

    toast.success('Campaign updated')
    await loadCampaigns()
  }, [selectedEventId, loadCampaigns, toast])

  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    const result = await apiService.deleteCampaign(selectedEventId, campaignId)

    if ('error' in result) {
      toast.error(`Failed to delete campaign: ${result.error}`)
      throw new Error(result.error)
    }

    toast.success('Campaign deleted')
    await loadCampaigns()
  }, [selectedEventId, loadCampaigns, toast])

  // ---- Render ----

  const isLoading = isLoadingEvents || isLoadingAttendees || isLoadingCampaigns || isLoadingConfig
  const loadingMessage = isLoadingEvents
    ? 'Loading events...'
    : isLoadingConfig
      ? 'Loading configuration...'
      : isLoadingAttendees
        ? 'Loading attendees...'
        : isLoadingCampaigns
          ? 'Loading campaigns...'
          : 'Loading...'

  return (
    <View width="100%" padding="size-400" UNSAFE_style={{ boxSizing: 'border-box' }}>
      {/* Header with Back Button and Event Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
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

        <Heading level={1} UNSAFE_style={{ margin: 0, flex: 1 }}>Event report</Heading>

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
                  onCreateCampaign={handleCreateCampaign}
                  onUpdateCampaign={handleUpdateCampaign}
                  onDeleteCampaign={handleDeleteCampaign}
                />
              </View>
            </Item>
          </TabPanels>
        </Tabs>
      </View>

      <BlurredLoadingOverlay
        visible={isLoading}
        message={loadingMessage}
        ariaLabel={loadingMessage.replace(/\.\.\.$/, '')}
      />
    </View>
  )
}

export default Registrations
