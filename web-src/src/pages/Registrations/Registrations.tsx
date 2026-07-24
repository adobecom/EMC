/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { SegmentedControl, SegmentedControlItem } from '@react-spectrum/s2'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { EventApiResponse } from '../../types/domain'
import type { Attendee, AttendeeStats, AttendeeColumnConfig } from '../../types/attendee'
import type { Campaign, CampaignFormData, CampaignCreatePayload, CampaignUpdatePayload, CampaignListResponse } from '../../types/campaign'
import type { RsvpToken } from '../../types/rsvpToken'
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
import { SessionsTab } from './SessionsTab'
import { GuestRsvpUrlsTab } from './GuestRsvpUrlsTab'

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
  const [rsvpTokens, setRsvpTokens] = useState<RsvpToken[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('registrations')

  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [isLoadingRsvpTokens, setIsLoadingRsvpTokens] = useState(false)
  const [, setError] = useState<string | null>(null)

  const selectedEvent = useMemo(() =>
    events.find(e => e.eventId === selectedEventId) || null,
    [events, selectedEventId]
  )

  const { columnConfig, isLoading: isLoadingConfig } = useRsvpConfig(selectedEvent?.cloudType)

  const hasCampaigns = campaigns.length > 0

  const effectiveColumnConfig = useMemo<AttendeeColumnConfig[]>(() => {
    if (!hasCampaigns) return columnConfig

    const campaignColumn: AttendeeColumnConfig = {
      key: 'campaignId',
      label: 'Campaign ID',
      type: 'text',
      fallback: '-',
      width: 130,
      sortable: true,
      isSticky: true
    }

    // Keep Registered Date (creationTime) immediately before RSVP Status / Checked In,
    // with Campaign ID directly before Registered Date when campaigns exist.
    const creationCol = columnConfig.find(c => c.key === 'creationTime')
    const withoutCreation = columnConfig.filter(c => c.key !== 'creationTime')
    const leading = withoutCreation.filter(c => !c.isSticky)
    const stickyTail = withoutCreation.filter(c => c.isSticky)

    return [
      ...leading,
      campaignColumn,
      ...(creationCol ? [creationCol] : []),
      ...stickyTail
    ]
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

  // ESP never returns a composed URL for an RSVP token — only the raw
  // token — so the shareable link is built client-side from the event's
  // published detail page, mirroring EventForm's/EventsDashboard's existing
  // preview-URL composition off event.detailPagePath.
  const composeRsvpTokenUrl = useCallback((token: RsvpToken): RsvpToken => {
    if (!selectedEvent?.detailPagePath) return token
    try {
      const url = new URL(selectedEvent.detailPagePath)
      url.searchParams.set('rsvpToken', token.token)
      return { ...token, url: url.toString() }
    } catch (err) {
      console.error('Failed to compose RSVP token URL from event detailPagePath:', err)
      return token
    }
  }, [selectedEvent])

  const loadRsvpTokens = useCallback(async () => {
    if (!selectedEventId) {
      setRsvpTokens([])
      return
    }

    setIsLoadingRsvpTokens(true)
    setRsvpTokens([])
    try {
      const result = await apiService.getRsvpTokens(selectedEventId) as RsvpToken[]
      if ('error' in result) {
        console.error('Failed to load RSVP tokens:', result)
        setRsvpTokens([])
        return
      }
      setRsvpTokens((result || []).map(composeRsvpTokenUrl))
    } catch (err) {
      console.error('Failed to load RSVP tokens:', err)
      setRsvpTokens([])
    } finally {
      setIsLoadingRsvpTokens(false)
    }
  }, [selectedEventId, composeRsvpTokenUrl])

  useEffect(() => {
    loadRsvpTokens()
  }, [loadRsvpTokens])

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

  const handleGenerateRsvpToken = useCallback(async () => {
    const result = await apiService.generateRsvpToken(selectedEventId)

    if ('error' in result) {
      toast.error(`Failed to generate guest RSVP link: ${result.error}`)
      throw new Error(result.error)
    }

    toast.success('Guest RSVP link generated')
    await loadRsvpTokens()
  }, [selectedEventId, loadRsvpTokens, toast])

  const handleExtendRsvpToken = useCallback(async (token: string, expiresInDays: number) => {
    const result = await apiService.updateRsvpToken(selectedEventId, token, { expiresInDays })

    if ('error' in result) {
      toast.error(`Failed to extend guest RSVP link: ${result.error}`)
      throw new Error(result.error)
    }

    toast.success('Guest RSVP link extended')
    await loadRsvpTokens()
  }, [selectedEventId, loadRsvpTokens, toast])

  const handleRevokeRsvpToken = useCallback(async (token: string) => {
    const result = await apiService.revokeRsvpToken(selectedEventId, token)

    if ('error' in result) {
      toast.error(`Failed to revoke guest RSVP link: ${result.error}`)
      throw new Error(result.error)
    }

    toast.success('Guest RSVP link revoked')
    await loadRsvpTokens()
  }, [selectedEventId, loadRsvpTokens, toast])

  // ---- Render ----

  const isLoading = isLoadingEvents || isLoadingAttendees || isLoadingCampaigns || isLoadingRsvpTokens || isLoadingConfig
  const loadingMessage = isLoadingEvents
    ? 'Loading events...'
    : isLoadingConfig
      ? 'Loading configuration...'
      : isLoadingAttendees
        ? 'Loading attendees...'
        : isLoadingCampaigns
          ? 'Loading campaigns...'
          : isLoadingRsvpTokens
            ? 'Loading guest RSVP links...'
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

      <div style={{ marginTop: '16px' }}>
        <SegmentedControl
          aria-label="Registrations Dashboard"
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(String(key))}
        >
          <SegmentedControlItem id="registrations">Registrations</SegmentedControlItem>
          <SegmentedControlItem id="campaigns">Campaigns</SegmentedControlItem>
          <SegmentedControlItem id="sessions">Sessions</SegmentedControlItem>
          <SegmentedControlItem id="guestRsvpUrls">Guest RSVP URLs</SegmentedControlItem>
        </SegmentedControl>
        <div style={{ paddingTop: '24px' }}>
          {selectedTab === 'registrations' && (
            <RegistrationsTab
              selectedEventId={selectedEventId}
              attendees={attendees}
              columnConfig={effectiveColumnConfig}
              onAttendeesRefresh={handleAttendeesRefresh}
              campaigns={campaigns}
              eventTitle={selectedEvent?.title || selectedEvent?.enTitle || ''}
            />
          )}
          {selectedTab === 'campaigns' && (
            <CampaignsTab
              eventId={selectedEventId}
              event={selectedEvent}
              campaigns={campaigns}
              onCreateCampaign={handleCreateCampaign}
              onUpdateCampaign={handleUpdateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}
          {selectedTab === 'sessions' && (
            <SessionsTab
              eventId={selectedEventId}
              eventTitle={selectedEvent?.title || selectedEvent?.enTitle || ''}
              attendees={attendees}
            />
          )}
          {selectedTab === 'guestRsvpUrls' && (
            <GuestRsvpUrlsTab
              eventId={selectedEventId}
              links={rsvpTokens}
              campaigns={campaigns}
              onGenerate={handleGenerateRsvpToken}
              onExtend={handleExtendRsvpToken}
              onRevoke={handleRevokeRsvpToken}
            />
          )}
        </div>
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
