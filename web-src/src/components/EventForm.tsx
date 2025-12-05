/* 
* <license header>
*/

import React, { useEffect, useCallback } from 'react'
import {
  View,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EventFormData,
  ProfileData,
  SponsorData,
  EventApiResponse
} from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'
import { FormWizard, WizardStep, LoadingSpinner, FormCard } from './shared'
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
  PageMetadataComponent 
} from './EventForm/index'
import { detectSocialPlatform } from '../utils/socialPlatformDetector'
import { useEventFeatureFlags } from '../hooks/useEventTypeFeatures'
import { EventFormProvider, useEventFormContext } from '../contexts/EventFormContext'
import { useEventFormSave } from '../hooks/useEventFormSave'

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
    socialLinks: (speaker.socialLinks || []).map((link: any) => ({
      url: link.url || link,
      platform: detectSocialPlatform(link.url || link)?.platform
    })),
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
    name: event.enTitle || localized.title || '',
    urlTitle: event.detailPagePath?.split('/').slice(-5, -4).join('/') || '',
    description: localized.eventDetails || '',
    shortDescription: localized.description || '',
    language: locale.split('-')[0] || 'en',
    defaultLocale: locale,
    isPrivate: event.isPrivate || false,
    tags: parsedTags,
    startDateTime: event.startDate || '',
    endDateTime: event.endDate || '',
    timezone: event.timezone,
    venue: venueData,
    capacity: event.attendeeLimit,
    status: event.published ? 'published' : 'draft',
    registrationOpen: true,
    allowWaitlist: event.allowWaitlisting || false,
    allowGuestRegistration: event.allowGuestRegistration || false,
    hostEmail: event.hostEmail || '',
    rsvpDescription: localized.rsvpDescription || '',
    registrationType: event.registration?.type || 'ESP',
    marketoFormUrl: event.registration?.formData || '',
    visibleRsvpFields: event.rsvpFormFields?.visible || [],
    requiredRsvpFields: event.rsvpFormFields?.required || [],
    images: event.images || [],
    profiles: mapSpeakersToProfiles(event.speakers || [], locale),
    communityForumUrl: cta?.url || '',
    secondaryLinkTitle: cta?.label || '',
    agendaItems: agendaItems,
    showAgendaPostEvent: event.showAgendaPostEvent || false,
    sponsors: mapSponsorsToFormData(event.sponsors || [], locale)
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
  
  // Get context
  const {
    formData,
    isEditMode,
    isLoading,
    updateFormData,
    setEventId,
    setEditMode,
    setEventResponse,
    setLoading,
    setLoadError,
    loadFromStorage,
    state,
  } = useEventFormContext()
  
  // Get save hook
  const { saveEvent, isSaving, saveError } = useEventFormSave()
  
  // Get feature flags based on event type
  const { hasVenue, hasPageMetadata } = useEventFeatureFlags(formData.eventType)
  
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
  
  const handleComplete = useCallback(async () => {
    await saveEvent({
      onSuccess: () => {
        setTimeout(() => {
          navigate('/resources')
        }, 1500)
      },
      onError: (error) => {
        console.error('Failed to save event:', error)
      }
    })
  }, [saveEvent, navigate])
  
  const handleCancel = useCallback(() => {
    navigate('/events')
  }, [navigate])
  
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
  
  return (
    <View 
      UNSAFE_style={{
        backgroundColor: 'var(--spectrum-global-color-gray-100)',
      }}
    >
      {saveError && (
        <View
          padding="size-200"
          backgroundColor="negative"
          borderRadius="medium"
          margin="size-300"
        >
          <Text UNSAFE_style={{ color: 'white' }}>Error: {saveError}</Text>
        </View>
      )}

      {state.saveStatus === 'success' && (
        <View
          padding="size-200"
          backgroundColor="positive"
          borderRadius="medium"
          margin="size-300"
        >
          <Text UNSAFE_style={{ color: 'white' }}>
            Event {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
          </Text>
        </View>
      )}

      <FormWizard
        steps={steps}
        onComplete={handleComplete}
        onCancel={handleCancel}
        isSubmitting={isSaving}
        showSideNav={true}
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
