/* 
* <license header>
*/

import React, { useEffect, useCallback, useRef } from 'react'
import {
  View,
  Flex
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EventFormData,
  ProfileData,
  SponsorData,
  EventApiResponse
} from '../../types/domain'
import { apiService } from '../../services/api'
import { IMS } from '../../types'
import { FormWizard, WizardStep, LoadingSpinner, FormCard } from '../../components/shared'
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
  
  const venueData = event.venue ? {
    venueName: event.venue.venueName || '',
    formattedAddress: event.venue.address || '',
    placeId: event.venue.placeId,
    coordinates: event.venue.coordinates,
    gmtOffset: event.gmtOffset,
    additionalInformation: event.venue.additionalInfo || '',
    venueImageUrl: event.venue.imageUrl,
    venueImageId: event.venue.imageId,
    showVenuePostEvent: event.showVenuePostEvent ?? true,
    showAdditionalInfoPostEvent: event.showVenueAdditionalInfoPostEvent ?? true
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
    updateFormData,
    setEventId,
    setEditMode,
    setEventResponse,
    setLoading,
    setLoadError,
    setPublished,
    setMaxStepReached,
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
  
  // Get feature flags based on event type
  const { hasVenue, hasPageMetadata, hasMarketoIntegration } = useEventFeatureFlags(formData.eventType)
  
  // ============================================================================
  // LOAD EVENT DATA
  // ============================================================================
  
  useEffect(() => {
    if (eventIdParam) {
      setEventId(eventIdParam)
      setEditMode(true)
      loadEvent(eventIdParam)
    } else {
      loadFromStorage()
    }
  }, [eventIdParam])
  
  const loadEvent = async (eventIdToLoad: string) => {
    setLoading(true)
    try {
      const response = await apiService.getEventFull(eventIdToLoad)
      
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

      {/* Marketo integration is only for ExperienceCloud events */}
      {hasMarketoIntegration && formData.cloudType === 'ExperienceCloud' && (
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
      />
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

