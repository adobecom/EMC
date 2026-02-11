/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef, useState } from 'react'
import {
  View,
  Flex,
  Picker,
  Item,
  Button,
  Text,
  Heading,
  Divider,
  ProgressCircle
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft'
import {
  EventFormData,
  ProfileData,
  SponsorData,
  EventApiResponse,
  SeriesApiResponse,
  SeriesTemplate
} from '../../types/domain'
import { apiService, cachedApi } from '../../services/api'
import { configService } from '../../services/configService'
import { IMS } from '../../types'
import { FormWizard, WizardStep, LoadingSpinner, FormCard, HistoryTimeline } from '../../components/shared'
import { 
  EventFormatComponent, 
  EventTagsComponent, 
  EventInfoComponent, 
  AgendaComponent, 
  VenueComponent, 
  SpeakersComponent, 
  SponsorsComponent, 
  EventImagesComponent, 
  RegistrationConfigComponent, 
  PageMetadataComponent,
  PromotionalContentComponent,
  MarketoIntegrationComponent
} from './index'
import { fromApiSocialLink } from '../../utils/socialPlatformDetector'
import { useEventFeatureFlags } from '../../hooks/useEventTypeFeatures'
import { EventFormProvider, useEventFormContext, useToast } from '../../contexts'
import { useEventFormSave } from '../../hooks/useEventFormSave'
import { COLORS, Z_INDEX, TYPOGRAPHY } from '../../styles/designSystem'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get a localized value from an object, falling back to direct property
 */
function getLocalizedValue(obj: any, fieldName: string, locale: string): any {
  const localized = obj?.localizations?.[locale]?.[fieldName]
  if (localized !== undefined && localized !== null && localized !== '') {
    return localized
  }
  return obj?.[fieldName]
}

/**
 * Map API speaker data to ProfileData format
 */
function mapSpeakersToProfiles(speakers: any[], locale: string = 'en-US'): ProfileData[] {
  return speakers.map(speaker => ({
    type: speaker.speakerType === 'host' ? 'host' : 'speaker',
    speakerId: speaker.speakerId,
    firstName: getLocalizedValue(speaker, 'firstName', locale) || speaker.firstName || '',
    lastName: getLocalizedValue(speaker, 'lastName', locale) || speaker.lastName || '',
    title: getLocalizedValue(speaker, 'title', locale) || speaker.title || '',
    bio: getLocalizedValue(speaker, 'bio', locale) || speaker.bio || '',
    imageUrl: speaker.photo?.imageUrl || speaker.imageUrl || '',
    imageId: speaker.photo?.imageId || speaker.imageId || '',
    // Convert API format (serviceName, link) to form format (url, platform)
    socialLinks: (speaker.socialLinks || []).map((link: any) => fromApiSocialLink(link)),
    isSaved: true,
    isFromSeries: true
  }))
}

/**
 * Map API sponsor data to SponsorData format
 */
function mapSponsorsToFormData(sponsors: any[], locale: string = 'en-US'): SponsorData[] {
  return sponsors.map((sponsor, index) => ({
    id: sponsor.sponsorId || `sponsor-${index}`,
    sponsorId: sponsor.sponsorId,
    partnerName: getLocalizedValue(sponsor, 'name', locale) || sponsor.name || sponsor.partnerName || '',
    partnerUrl: getLocalizedValue(sponsor, 'link', locale) || sponsor.link || sponsor.partnerUrl || '',
    imageUrl: sponsor.image?.imageUrl || sponsor.imageUrl || '',
    imageId: sponsor.image?.imageId || sponsor.imageId || '',
    type: sponsor.sponsorType, // Map sponsorType from API to type in form
    isSaved: true,
    isFromSeries: true
  }))
}

/**
 * Map API response to form data
 */
function mapApiResponseToFormData(event: EventApiResponse, locale: string): Partial<EventFormData> {
  const localized = event.localizations?.[locale] || {}
  
  const parsedTags = event.tags 
    ? event.tags.split(',').map((tag: string) => ({
        name: tag.split('/').pop() || tag,
        caasId: tag.trim()
      }))
    : []
  
  const agendaItems = (localized.agenda || []).map((item: any, index: number) => ({
    id: `agenda-${index}`,
    title: item.title || '',
    description: item.description || '',
    startDateTime: item.startTime 
      ? `${event.localStartDate}T${item.startTime}` 
      : '',
    endDateTime: item.endTime 
      ? `${event.localStartDate}T${item.endTime}` 
      : ''
  }))
  
  const cta = localized.cta?.[0]
  
  // Map venue data — include ALL fields the PUT/POST API requires so they're
  // available in onAfterSave without a second network round-trip.
  // The GET response has both `formattedAddress` and the derived `address`
  // convenience field; prefer `formattedAddress` since that's what the write
  // API expects.
  const venueLocalized = event.venue?.localizations?.[locale] || {}
  const venueData = event.venue ? {
    venueName: event.venue.venueName || '',
    formattedAddress: event.venue.formattedAddress || event.venue.address || '',
    placeId: event.venue.placeId,
    coordinates: event.venue.coordinates,
    gmtOffset: event.venue.gmtOffset ?? event.gmtOffset,
    addressComponents: event.venue.addressComponents,
    additionalInformation: venueLocalized.additionalInformation
      ?? event.venue.additionalInformation
      ?? event.venue.additionalInfo
      ?? '',
    venueImageUrl: event.venue.imageUrl,
    venueImageId: event.venue.imageId,
    showVenuePostEvent: event.showVenuePostEvent ?? true,
    showAdditionalInfoPostEvent: event.showVenueAdditionalInfoPostEvent ?? true,
    googlePlaceName: event.venue.venueName || '', // Populate for alternative-name feature
  } : undefined
  
  const mappedEventType = event.eventType?.toLowerCase() === 'webinar' ? 'webinar' : 'in-person'
  
  return {
    cloudType: (event.cloudType as 'CreativeCloud' | 'ExperienceCloud') || 'CreativeCloud',
    eventType: mappedEventType as 'in-person' | 'webinar',
    seriesId: event.seriesId || '',
    name: localized.title || '',
    enTitle: event.enTitle || '',
    urlTitle: event.detailPagePath?.split('/').slice(-5, -4).join('/') || '',
    description: localized.eventDetails || '',
    shortDescription: localized.description || '',
    language: locale.split('-')[0] || 'en',
    defaultLocale: locale,
    isPrivate: event.isPrivate || false,
    tags: parsedTags,
    // Use localStartDate + localStartTime (already in event's timezone) 
    // instead of startDate/endDate (which are UTC and cause timezone shift)
    startDateTime: event.localStartDate && event.localStartTime 
      ? `${event.localStartDate}T${event.localStartTime.slice(0, 5)}` 
      : '',
    endDateTime: event.localEndDate && event.localEndTime 
      ? `${event.localEndDate}T${event.localEndTime.slice(0, 5)}` 
      : '',
    timezone: event.timezone,
    venue: venueData,
    attendeeLimit: event.attendeeLimit,
    status: event.published ? 'published' : 'draft',
    registrationOpen: true,
    allowWaitlist: event.allowWaitlisting || false,
    allowGuestRegistration: event.allowGuestRegistration || false,
    hostEmail: event.hostEmail || '',
    rsvpDescription: localized.rsvpDescription || '',
    registrationType: (event.registration?.type === 'ESP' || event.registration?.type === 'Marketo') 
      ? event.registration.type 
      : 'ESP',
    marketoFormUrl: event.registration?.formData || '',
    visibleRsvpFields: event.rsvpFormFields?.visible || [],
    requiredRsvpFields: event.rsvpFormFields?.required || [],
    images: event.images || [],
    profiles: mapSpeakersToProfiles(event.speakers || [], locale),
    communityForumUrl: cta?.url || '',
    secondaryLinkTitle: cta?.label || '',
    agendaItems: agendaItems,
    showAgendaPostEvent: event.showAgendaPostEvent || false,
    sponsors: mapSponsorsToFormData(event.sponsors || [], locale),
    // Map promotional items from localized data
    // API can return either string[] or PromotionalItem[] depending on context
    promotionalItems: (localized.promotionalItems || [])
      .filter((item: any) => {
        if (typeof item === 'string') return item.trim() !== ''
        return item && item.title
      })
      .map((item: any) => {
        if (typeof item === 'string') return { title: item }
        return item
      }),
    // Map Marketo integration data
    marketoIntegration: event.marketoIntegration,
  }
}

// ============================================================================
// FORMAT SELECTION OVERLAY
// ============================================================================

interface CloudOption {
  key: string
  label: string
}

interface SeriesOption {
  id: string
  name: string
  description?: string
}

/**
 * FormatSelectionOverlay - Full-screen frosted glass overlay with cloud/series selection
 * 
 * Shown when the user has not yet confirmed cloud + series for a new event.
 * The form renders behind the overlay but is non-interactive.
 */
const FormatSelectionOverlay: React.FC<{
  eventType: 'in-person' | 'webinar'
  onConfirm: (cloudType: 'CreativeCloud' | 'ExperienceCloud', seriesId: string) => void
  onCancel: () => void
}> = ({ eventType, onConfirm, onCancel }) => {
  // Local state for selections — only committed to context on confirm
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)

  // Data
  const [clouds] = useState<CloudOption[]>([
    { key: 'CreativeCloud', label: 'Creative Cloud' },
    { key: 'ExperienceCloud', label: 'Experience Cloud' }
  ])
  const [allSeries, setAllSeries] = useState<SeriesApiResponse[]>([])
  const [seriesTemplates, setSeriesTemplates] = useState<SeriesTemplate[]>([])
  const [filteredSeries, setFilteredSeries] = useState<SeriesOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [seriesResponse, templatesConfig] = await Promise.all([
          cachedApi.getSeriesList(),
          configService.getSeriesTemplates()
        ])

        if (!isMounted) return

        if (templatesConfig?.data) {
          setSeriesTemplates(templatesConfig.data)
        }

        if (seriesResponse && Array.isArray(seriesResponse)) {
          const published = seriesResponse.filter(
            (s: SeriesApiResponse) => s.seriesStatus === 'published'
          )
          setAllSeries(published)
        } else {
          setError('Failed to load series list')
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load format selection data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])

  // ============================================================================
  // SERIES FILTERING
  // ============================================================================

  /**
   * Map form event type to API event type format
   */
  const mapEventTypeToApiFormat = (type: string): string => {
    const mapping: Record<string, string> = {
      'in-person': 'InPerson',
      'webinar': 'Webinar',
      'hybrid': 'Hybrid'
    }
    return mapping[type] || type
  }

  /**
   * Check if a series template supports the given event type
   */
  const templateSupportsEventType = (templateId: string, currentEventType: string, templates: SeriesTemplate[]): boolean => {
    const apiEventType = mapEventTypeToApiFormat(currentEventType)
    const template = templates.find(t => t['template-path'] === templateId)
    
    if (!template) {
      // Backward compatibility: allow if template not in config
      return true
    }
    
    const supportedType = template['supported-event-type']
    if (supportedType === 'Hybrid') return true
    return supportedType === apiEventType
  }

  useEffect(() => {
    if (!selectedCloud || allSeries.length === 0) {
      setFilteredSeries([])
      return
    }

    // Filter by cloud type
    let filtered = allSeries.filter(
      (s: SeriesApiResponse) => s.cloudType === selectedCloud
    )

    // Filter by event type using template matching
    if (seriesTemplates.length > 0) {
      filtered = filtered.filter((s: SeriesApiResponse) =>
        templateSupportsEventType(s.templateId, eventType, seriesTemplates)
      )
    }

    const options = filtered.map((s: SeriesApiResponse) => ({
      id: s.seriesId,
      name: s.seriesName,
      description: s.seriesDescription
    }))

    setFilteredSeries(options)

    // Clear series selection if the previously selected series is no longer available
    if (selectedSeries && !options.some(s => s.id === selectedSeries)) {
      setSelectedSeries(null)
    }
  }, [selectedCloud, allSeries, seriesTemplates, eventType])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCloudChange = (key: React.Key | null) => {
    setSelectedCloud(key ? String(key) : null)
    setSelectedSeries(null) // Reset series when cloud changes
  }

  const handleSeriesChange = (key: React.Key | null) => {
    setSelectedSeries(key ? String(key) : null)
  }

  const handleConfirm = () => {
    if (selectedCloud && selectedSeries) {
      onConfirm(
        selectedCloud as 'CreativeCloud' | 'ExperienceCloud',
        selectedSeries
      )
    }
  }

  const isConfirmDisabled = !selectedCloud || !selectedSeries

  // ============================================================================
  // RENDER
  // ============================================================================

  const eventTypeLabel = eventType === 'webinar' ? 'Webinar' : 'In-person Event'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: Z_INDEX.MODAL_BACKDROP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        backgroundColor="gray-50"
        borderRadius="medium"
        padding="size-500"
        width="520px"
        UNSAFE_style={{
          zIndex: Z_INDEX.MODAL,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
          maxWidth: '90vw',
        }}
      >
        {/* Header */}
        <Flex direction="column" gap="size-100" marginBottom="size-300">
          <Text UNSAFE_style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: COLORS.GRAY_700,
            letterSpacing: '0.3px',
          }}>
            {eventTypeLabel.toUpperCase()}
          </Text>
          <Heading level={2} UNSAFE_style={{ 
            ...TYPOGRAPHY.STEP_HEADING,
            fontSize: '22px',
          }}>
            Select Event Format
          </Heading>
          <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
            Choose the cloud and series for this event. This determines
            where your event will be published and what metadata it inherits.
          </Text>
        </Flex>

        <Divider size="S" marginBottom="size-300" />

        {/* Content */}
        {isLoading ? (
          <Flex 
            alignItems="center" 
            justifyContent="center" 
            minHeight="size-2000"
            direction="column"
            gap="size-200"
          >
            <ProgressCircle aria-label="Loading format options..." isIndeterminate size="M" />
            <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '14px' }}>
              Loading format options...
            </Text>
          </Flex>
        ) : error ? (
          <View
            padding="size-200"
            backgroundColor="negative"
            borderRadius="medium"
            marginBottom="size-300"
          >
            <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
          </View>
        ) : (
          <Flex direction="column" gap="size-300" marginBottom="size-400">
            <Picker
              label="Cloud"
              isRequired
              selectedKey={selectedCloud}
              onSelectionChange={handleCloudChange}
              placeholder="Choose a cloud..."
              width="100%"
            >
              {clouds.map((cloud) => (
                <Item key={cloud.key}>{cloud.label}</Item>
              ))}
            </Picker>

            <Picker
              label="Series"
              isRequired
              selectedKey={selectedSeries}
              onSelectionChange={handleSeriesChange}
              isDisabled={!selectedCloud}
              placeholder={!selectedCloud ? 'Select a cloud first' : 'Choose a series...'}
              width="100%"
              description={
                selectedSeries
                  ? filteredSeries.find(s => s.id === selectedSeries)?.description || undefined
                  : undefined
              }
            >
              {filteredSeries.length === 0 ? (
                <Item key="no-series">No series available for this cloud</Item>
              ) : (
                filteredSeries.map((s) => (
                  <Item key={s.id}>{s.name}</Item>
                ))
              )}
            </Picker>

            {selectedCloud && filteredSeries.length === 0 && (
              <View
                padding="size-150"
                backgroundColor="notice"
                borderRadius="medium"
              >
                <Text UNSAFE_style={{ fontSize: '13px' }}>
                  No event series available for this cloud and event type combination. 
                  Please create a series first or contact your administrator.
                </Text>
              </View>
            )}
          </Flex>
        )}

        <Divider size="S" marginBottom="size-300" />

        {/* Actions */}
        <Flex direction="row" justifyContent="end" gap="size-200">
          <Button
            variant="secondary"
            onPress={onCancel}
          >
            <ChevronLeft size="S" />
            <Text>Back to Dashboard</Text>
          </Button>
          <Button
            variant="accent"
            onPress={handleConfirm}
            isDisabled={isConfirmDisabled || isLoading}
          >
            <Text>Confirm & Continue</Text>
            <ChevronRight size="S" />
          </Button>
        </Flex>
      </View>
    </div>
  )
}

// ============================================================================
// INNER FORM COMPONENT (uses context)
// ============================================================================

interface EventFormInnerProps {
  ims: IMS
}

const EventFormInner: React.FC<EventFormInnerProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id: eventIdParam } = useParams<{ id: string }>()
  const toast = useToast()
  
  // Track the last error shown to prevent duplicate toasts
  const lastErrorShownRef = useRef<string | null>(null)
  
  // Get context
  const {
    formData,
    eventId,
    isEditMode,
    isLoading,
    isPublished,
    maxStepReached,
    isFormatConfirmed,
    updateFormData,
    setEventId,
    setEditMode,
    setEventResponse,
    setLoading,
    setLoadError,
    setPublished,
    setMaxStepReached,
    setFormatConfirmed,
    setSeriesId,
    loadFromStorage,
    persistToStorage,
    state,
  } = useEventFormContext()
  
  // Get save hook
  const { saveEvent, publishEvent, saveDraft, isSaving, saveError } = useEventFormSave()
  
  // Show toast when saveError changes
  useEffect(() => {
    if (saveError && saveError !== lastErrorShownRef.current) {
      toast.error(saveError, { duration: 8000 })
      lastErrorShownRef.current = saveError
    }
    // Reset when error is cleared
    if (!saveError) {
      lastErrorShownRef.current = null
    }
  }, [saveError, toast])
  
  // Get feature flags based on event type + cloud type
  const { hasVenue, hasPageMetadata, hasMarketoIntegration } = useEventFeatureFlags(formData.eventType, formData.cloudType)
  
  // ============================================================================
  // LOAD EVENT DATA
  // ============================================================================
  
  useEffect(() => {
    if (eventIdParam) {
      setEventId(eventIdParam)
      setEditMode(true)
      setFormatConfirmed(true) // Edit mode: format is already set
      loadEvent(eventIdParam)
    } else {
      loadFromStorage()
    }
  }, [eventIdParam])
  
  // Auto-confirm format when loading a draft that already has cloud + series selected
  useEffect(() => {
    if (!isEditMode && !isFormatConfirmed && formData.cloudType && formData.seriesId) {
      setFormatConfirmed(true)
    }
  }, [isEditMode, isFormatConfirmed, formData.cloudType, formData.seriesId, setFormatConfirmed])
  
  const loadEvent = async (eventIdToLoad: string) => {
    setLoading(true)
    try {
      const response = await cachedApi.getEventFull(eventIdToLoad)
      
      if ('error' in response) {
        console.error('Failed to load event:', response)
        setLoadError('Failed to load event data')
        return
      }
      
      setEventResponse(response as EventApiResponse)
      
      // Set published status
      setPublished(response.published ?? false)
      
      // When editing an existing event, all steps are accessible
      setMaxStepReached(3) // 0-indexed, so 3 is the last step (RSVP)
      
      const eventLocale = response.defaultLocale || 'en-US'
      const mappedData = mapApiResponseToFormData(response as EventApiResponse, eventLocale)
      updateFormData(mappedData)
      
    } catch (err) {
      console.error('Failed to load event:', err)
      setLoadError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }
  
  // ============================================================================
  // FORMAT SELECTION HANDLERS
  // ============================================================================
  
  /**
   * Handle format selection confirmation from the overlay dialog
   */
  const handleFormatConfirm = useCallback((
    cloudType: 'CreativeCloud' | 'ExperienceCloud',
    seriesId: string
  ) => {
    updateFormData({ cloudType })
    setSeriesId(seriesId)
    setFormatConfirmed(true)
  }, [updateFormData, setSeriesId, setFormatConfirmed])
  
  /**
   * Handle cancel from the format selection overlay — go back to dashboard
   */
  const handleFormatCancel = useCallback(() => {
    navigate('/events')
  }, [navigate])
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  /**
   * Handle Save button click - saves to API + sessionStorage without advancing
   * Returns true on success, false on failure
   */
  const handleSave = useCallback(async (): Promise<boolean> => {
    // First persist to sessionStorage immediately
    persistToStorage()
    
    // Then save to API
    const result = await saveDraft({
      onSuccess: (savedEventId) => {
        console.log('Event saved successfully:', savedEventId)
        toast.success(isEditMode ? 'Event updated successfully!' : 'Event saved successfully!')
      },
      onError: (error) => {
        console.error('Failed to save event:', error)
        // Error toast is handled by the useEffect watching saveError
      }
    })
    
    return result.success
  }, [saveDraft, persistToStorage, toast, isEditMode])
  
  /**
   * Handle Next Step button click - saves to API + sessionStorage then advances
   * Returns true on success (so FormWizard can advance), false on failure
   */
  const handleNextStep = useCallback(async (): Promise<boolean> => {
    // First persist to sessionStorage immediately
    persistToStorage()
    
    // Then save to API
    const result = await saveDraft({
      onSuccess: (savedEventId) => {
        console.log('Event saved before advancing:', savedEventId)
        // Show a subtle success toast for auto-save during navigation
        toast.success('Progress saved', { duration: 2000 })
      },
      onError: (error) => {
        console.error('Failed to save event:', error)
        // Error toast is handled by the useEffect watching saveError
      }
    })
    
    return result.success
  }, [saveDraft, persistToStorage, toast])
  
  /**
   * Handle Publish/Re-publish button click (last step completion)
   */
  const handleComplete = useCallback(async () => {
    // Persist to sessionStorage first
    persistToStorage()
    
    // Save and publish
    await publishEvent({
      onSuccess: () => {
        setPublished(true)
        toast.success(
          isPublished ? 'Event re-published successfully!' : 'Event published successfully!',
          { 
            duration: 3000,
            action: {
              label: 'View Events',
              onPress: () => navigate('/events')
            }
          }
        )
        // Navigate after a short delay to let user see the success message
        setTimeout(() => {
          navigate('/events')
        }, 2000)
      },
      onError: (error) => {
        console.error('Failed to publish event:', error)
        // Error toast is handled by the useEffect watching saveError
      }
    })
  }, [publishEvent, persistToStorage, setPublished, navigate, toast, isPublished])
  
  /**
   * Handle max step change from FormWizard
   */
  const handleMaxStepChange = useCallback((step: number) => {
    setMaxStepReached(step)
  }, [setMaxStepReached])
  
  const handleCancel = useCallback(() => {
    navigate('/events')
  }, [navigate])
  
  /**
   * Handle preview requests
   * Uses detailPagePath from event response with preview parameters
   */
  const handlePreview = useCallback((previewType: 'pre-event' | 'post-event') => {
    const eventResponse = state.eventDataResp
    
    if (!eventResponse?.detailPagePath) {
      console.warn('Cannot preview - event has no detail page path')
      return
    }
    
    const localStartTimeMillis = eventResponse.localStartTimeMillis || 0
    // Pre-event: timing before event start, Post-event: timing after event start
    const timing = previewType === 'pre-event' 
      ? localStartTimeMillis - 10 
      : localStartTimeMillis + 10
    
    // Build the preview URL with parameters
    const detailPagePath = eventResponse.detailPagePath
    const separator = detailPagePath.includes('?') ? '&' : '?'
    const previewUrl = `${detailPagePath}${separator}previewMode=true&timing=${timing}`
    
    window.open(previewUrl, '_blank')
  }, [state.eventDataResp])
  
  // ============================================================================
  // STEP 1: Basic Info
  // All components now use context directly - no props needed
  // ============================================================================
  const step1IsValid =
    formData.seriesId !== '' &&
    formData.name.trim() !== '' &&
    formData.language !== '' &&
    Boolean(formData.shortDescription && formData.shortDescription.trim() !== '') &&
    formData.startDateTime !== '' &&
    formData.endDateTime !== '' &&
    Boolean(formData.timezone && formData.timezone.trim() !== '') && // Timezone is required
    (hasVenue ? formData.venue?.venueName?.trim() !== '' : true)
  
  const step1Component = (
    <Flex direction="column" gap="size-0">
      <FormCard>
        <EventFormatComponent />
      </FormCard>

      <FormCard>
        <EventTagsComponent />
      </FormCard>

      <FormCard>
        <EventInfoComponent />
      </FormCard>

      <FormCard>
        <AgendaComponent />
      </FormCard>

      {hasVenue && (
        <FormCard>
          <VenueComponent />
        </FormCard>
      )}

      {hasPageMetadata && (
        <FormCard>
          <PageMetadataComponent />
        </FormCard>
      )}

      {hasMarketoIntegration && (
        <FormCard>
          <MarketoIntegrationComponent />
        </FormCard>
      )}
    </Flex>
  )
  
  // ============================================================================
  // STEP 2: Speakers & Hosts
  // ============================================================================
  const step2Component = (
    <FormCard>
      <SpeakersComponent />
    </FormCard>
  )
  
  // ============================================================================
  // STEP 3: Additional Content
  // ============================================================================
  const step3Component = (
    <>
      <FormCard>
        <PromotionalContentComponent />
      </FormCard>

      <FormCard>
        <SponsorsComponent />
      </FormCard>

      <FormCard>
        <EventImagesComponent />
      </FormCard>
    </>
  )
  
  // ============================================================================
  // STEP 4: RSVP
  // ============================================================================
  const step4Component = (
    <FormCard>
      <RegistrationConfigComponent />
    </FormCard>
  )
  
  // ============================================================================
  // WIZARD STEPS
  // ============================================================================
  const steps: WizardStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Info',
      description: 'Event format, tags, information, date/time, and venue',
      component: step1Component,
      isValid: step1IsValid
    },
    {
      id: 'speakers-hosts',
      title: 'Speakers & Hosts',
      description: 'Add speaker and host profiles (optional)',
      component: step2Component,
      isValid: true
    },
    {
      id: 'additional-content',
      title: 'Additional Content',
      description: 'Add event images and visual content (optional)',
      component: step3Component,
      isValid: true
    },
    {
      id: 'rsvp',
      title: 'RSVP',
      description: 'Configure attendance capacity and registration settings',
      component: step4Component,
      isValid: true
    }
  ]
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return <LoadingSpinner message="Loading event data..." />
  }
  
  // Determine event type label for display
  const getEventTypeLabel = (): string => {
    const eventType = formData.eventType
    switch (eventType) {
      case 'webinar':
        return 'Webinar'
      case 'in-person':
      default:
        return 'In-person event'
    }
  }

  // Render history timeline only in edit mode with a valid eventId
  const renderHeaderActions = () => {
    if (!isEditMode || !eventId) {
      return null
    }
    return <HistoryTimeline resourceId={eventId} resourceType="event" />
  }

  // Whether to show the format selection overlay
  const showFormatOverlay = !isFormatConfirmed && !isEditMode

  return (
    <View 
      UNSAFE_style={{
        backgroundColor: 'var(--spectrum-global-color-gray-100)',
      }}
    >
      <FormWizard
        steps={steps}
        onComplete={handleComplete}
        onSave={handleSave}
        onNextStep={handleNextStep}
        onCancel={handleCancel}
        onPreview={handlePreview}
        isSubmitting={isSaving}
        showSideNav={true}
        hasEventId={!!eventId}
        isPublished={isPublished}
        maxStepReached={maxStepReached}
        onMaxStepChange={handleMaxStepChange}
        eventTypeLabel={getEventTypeLabel()}
        headerActions={renderHeaderActions()}
      />

      {/* Format Selection Overlay — frosted glass + dialog */}
      {showFormatOverlay && (
        <FormatSelectionOverlay
          eventType={formData.eventType}
          onConfirm={handleFormatConfirm}
          onCancel={handleFormatCancel}
        />
      )}
    </View>
  )
}

// ============================================================================
// MAIN COMPONENT (provides context)
// ============================================================================

interface EventFormProps {
  ims: IMS
}

export const EventForm: React.FC<EventFormProps> = ({ ims }) => {
  const { id, eventType: eventTypeParam } = useParams<{ id: string; eventType: string }>()
  
  const initialEventType = (eventTypeParam === 'webinar' ? 'webinar' : 'in-person') as 'in-person' | 'webinar'
  
  return (
    <EventFormProvider
      initialEventId={id || null}
      initialEventType={initialEventType}
      autoPersist={true}
    >
      <EventFormInner ims={ims} />
    </EventFormProvider>
  )
}
