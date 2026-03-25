/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Tabs, TabList, Tab, TabPanel } from '@react-spectrum/s2'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { EventApiResponse } from '../../types/domain'
import type { Attendee, AttendeeStats, AttendeeColumnConfig } from '../../types/attendee'
import type { Campaign, CampaignFormData, CampaignCreatePayload, CampaignUpdatePayload, CampaignListResponse } from '../../types/campaign'
import { calculateAttendeeStats } from '../../types/attendee'
import { apiService } from '../../services/api'
import { useRsvpConfig } from '../../hooks/useRsvpConfig'
import { useRBACFilter } from '../../hooks'
import { useGroup } from '../../contexts/GroupContext'
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
  const { groupVersion } = useGroup()
  const { filterEvents } = useRBACFilter()

  const initialEventId = paramEventId || searchParams.get('eventId') || ''

  // State
  const [events, setEvents] = useState<EventApiResponse[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('registrations')

  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [, setError] = useState<string | null>(null)

  const selectedEvent = useMemo(() =>
    events.find(e => e.eventId === selectedEventId) || null,
    [events, selectedEventId]
  )

  const { columnConfig, isLoading: isLoadingConfig } = useRsvpConfig(selectedEvent?.cloudType)

  const hasCampaigns = campaigns.length > 0

  const effectiveColumnConfig = useMemo<AttendeeColumnConfig[]>(() => {
    if (!hasCampaigns) return columnConfig

    const nonSticky = columnConfig.filter(c => !c.isSticky)
    const sticky = columnConfig.filter(c => c.isSticky)

    const campaignColumn: AttendeeColumnConfig = {
      key: 'campaignId',
      label: 'Campaign',
      type: 'text',
      fallback: '-',
      width: 130,
      sortable: true,
      isSticky: true
    }

    return [...nonSticky, campaignColumn, ...sticky]
  }, [columnConfig, hasCampaigns])

  // ---- Data loading ----

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoadingEvents(true)
      try {
        const eventsData = await apiService.getEventsList()

        if (Array.isArray(eventsData)) {
          setEvents(filterEvents(eventsData))

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
  }, [groupVersion]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setCampaigns([])
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
    <div style={{ width: '100%', padding: '32px', boxSizing: 'border-box' }}>
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

        <h1 style={{ margin: 0, flex: 1 }}>Event report</h1>

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
        <div style={{ marginBottom: '24px' }}>
          <EventInfoComponent
            event={selectedEvent}
            stats={stats}
          />
        </div>
      )}

      {/* Tabbed Content Area */}
      <div style={{ marginTop: '16px' }}>
        <Tabs
          aria-label="Registrations Dashboard"
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(String(key))}
        >
          <TabList>
            <Tab id="registrations">Registrations</Tab>
            <Tab id="campaigns">Campaigns</Tab>
          </TabList>
          <TabPanel id="registrations">
            <div style={{ paddingTop: '24px' }}>
              <RegistrationsTab
                selectedEventId={selectedEventId}
                attendees={attendees}
                columnConfig={effectiveColumnConfig}
                onAttendeesRefresh={handleAttendeesRefresh}
                campaigns={campaigns}
              />
            </div>
          </TabPanel>
          <TabPanel id="campaigns">
            <div style={{ paddingTop: '24px' }}>
              <CampaignsTab
                eventId={selectedEventId}
                event={selectedEvent}
                campaigns={campaigns}
                onCreateCampaign={handleCreateCampaign}
                onUpdateCampaign={handleUpdateCampaign}
                onDeleteCampaign={handleDeleteCampaign}
              />
            </div>
          </TabPanel>
        </Tabs>
      </div>

      <BlurredLoadingOverlay
        visible={isLoading}
        message={loadingMessage}
        ariaLabel={loadingMessage.replace(/\.\.\.$/, '')}
      />
    </div>
  )
}

export default Registrations
