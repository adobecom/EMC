/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Text
} from '@adobe/react-spectrum'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EventFormData,
  ProfileData,
  VenueData,
  SponsorData
} from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'
import { FormWizard, WizardStep, LoadingSpinner, FormCard } from './shared'
import { EventFormatComponent, EventTagsComponent, EventInfoComponent, AgendaComponent, VenueComponent, ProfilesComponent, SponsorsComponent, EventImagesComponent, RegistrationConfigComponent, PageMetadataComponent } from './EventForm/index'
import { detectSocialPlatform } from '../utils/socialPlatformDetector'
import { useEventFeatureFlags } from '../hooks/useEventTypeFeatures'

/**
 * Get a localized value from an object, falling back to direct property
 * Checks localizations[locale].fieldName first, then direct fieldName
 */
function getLocalizedValue(obj: any, fieldName: string, locale: string): any {
  // Check localized value first
  const localized = obj?.localizations?.[locale]?.[fieldName]
  if (localized !== undefined && localized !== null && localized !== '') {
    return localized
  }
  // Fall back to direct property
  return obj?.[fieldName]
}

/**
 * Map API speaker data to ProfileData format
 * Extracts localized values from the correct locale
 */
function mapSpeakersToProfiles(speakers: any[], locale: string = 'en-US'): ProfileData[] {
  return speakers.map(speaker => ({
    type: speaker.speakerType === 'host' ? 'host' : 'speaker',
    firstName: getLocalizedValue(speaker, 'firstName', locale) || speaker.firstName || '',
    lastName: getLocalizedValue(speaker, 'lastName', locale) || speaker.lastName || '',
    title: getLocalizedValue(speaker, 'title', locale) || speaker.title || '',
    bio: getLocalizedValue(speaker, 'bio', locale) || speaker.bio || '',
    imageUrl: speaker.photo?.imageUrl || speaker.imageUrl || '',
    imageId: speaker.photo?.imageId || speaker.imageId || '',
    socialLinks: (speaker.socialLinks || []).map((link: any) => ({
      url: link.url || link,
      platform: detectSocialPlatform(link.url || link)?.platform
    }))
  }))
}

/**
 * Map API sponsor data to SponsorData format
 * Extracts localized values from the correct locale
 */
function mapSponsorsToFormData(sponsors: any[], locale: string = 'en-US'): SponsorData[] {
  return sponsors.map((sponsor, index) => ({
    id: sponsor.sponsorId || `sponsor-${index}`,
    partnerName: getLocalizedValue(sponsor, 'name', locale) || sponsor.name || sponsor.partnerName || '',
    partnerUrl: getLocalizedValue(sponsor, 'link', locale) || sponsor.link || sponsor.partnerUrl || '',
    imageUrl: sponsor.image?.imageUrl || sponsor.imageUrl || '',
    imageId: sponsor.image?.imageId || sponsor.imageId || '',
    isSaved: true // Already saved since it came from API
  }))
}

interface EventFormProps {
  ims: IMS
}


export const EventForm: React.FC<EventFormProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id, eventType: eventTypeParam } = useParams<{ id: string; eventType: string }>()
  const isEditMode = !!id
  
  // Determine event type from route param (for new events) or default to 'in-person'
  const initialEventType = (eventTypeParam === 'webinar' ? 'webinar' : 'in-person') as 'in-person' | 'webinar'

  // Form data state
  const [formData, setFormData] = useState<EventFormData>({
    cloudType: 'CreativeCloud',
    eventType: initialEventType,
    seriesId: '',
    organizationId: '',
    name: '',
    urlTitle: '',
    description: '',
    shortDescription: '',
    language: 'en',
    isPrivate: false,
    tags: [],
    startDateTime: '',
    endDateTime: '',
    timezone: '',
    venue: {
      venueName: '',
      formattedAddress: '',
      additionalInformation: '',
      showVenuePostEvent: false,
      showAdditionalInfoPostEvent: false
    },
    capacity: undefined,
    status: 'draft',
    registrationOpen: false,
    allowWaitlist: false,
    allowGuestRegistration: false,
    hostEmail: '',
    rsvpDescription: '',
    registrationType: 'ESP',
    marketoFormUrl: '',
    visibleRsvpFields: [],
    requiredRsvpFields: [],
    images: [],
    profiles: [],
    communityForumUrl: '',
    secondaryLinkTitle: '',
    agendaItems: [],
    showAgendaPostEvent: false,
    sponsors: []
  })
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isEditMode && id) {
      loadEvent(id)
    }
  }, [id])

  const loadEvent = async (eventId: string) => {
    setIsLoading(true)
    try {
      // Get full event data including speakers, sponsors, and venue
      const response = await apiService.getEventFull(eventId)
      
      // Check if response is an error
      if ('error' in response) {
        console.error('Failed to load event:', response)
        setError('Failed to load event data')
        return
      }

      const event = response
      const locale = event.defaultLocale || 'en-US'
      const localized = event.localizations?.[locale] || {}
      
      // Parse tags from comma-separated CAAS tag string to array
      const parsedTags = event.tags 
        ? event.tags.split(',').map((tag: string) => ({
            name: tag.split('/').pop() || tag,
            caasId: tag.trim()
          }))
        : []
      
      // Parse agenda items from localizations
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
      
      // Parse secondary link (CTA) from localizations
      const cta = localized.cta?.[0]
      
      // Map venue data if present
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
      } : formData.venue
      
        // Map the loaded event to form data
      // Determine event type from API response (InPerson/Webinar or similar)
      const mappedEventType = event.eventType?.toLowerCase() === 'webinar' ? 'webinar' : 'in-person'
      
        setFormData({
        // Basic info
        cloudType: (event.cloudType as 'CreativeCloud' | 'ExperienceCloud') || 'CreativeCloud',
        eventType: mappedEventType as 'in-person' | 'webinar',
        seriesId: event.seriesId || '',
        organizationId: formData.organizationId,
        name: event.enTitle || localized.title || '',
        urlTitle: event.detailPagePath?.split('/').slice(-5, -4).join('/') || '',
        description: localized.eventDetails || '',
        shortDescription: localized.description || '',
        language: locale.split('-')[0] || 'en',
        isPrivate: event.isPrivate || false,
        
        // Tags
        tags: parsedTags,
        
        // Date & Time
        startDateTime: event.startDate || '',
        endDateTime: event.endDate || '',
        timezone: event.timezone,
        
        // Venue
        venue: venueData,
        
        // Registration
        capacity: event.attendeeLimit,
        status: event.published ? 'published' : 'draft',
        registrationOpen: true,
        allowWaitlist: event.allowWaitlisting || false,
        allowGuestRegistration: event.allowGuestRegistration || false,
        hostEmail: event.hostEmail || '',
        rsvpDescription: localized.rsvpDescription || '',
        registrationType: event.registration?.type || 'ESP',
        marketoFormUrl: event.registration?.marketoFormUrl || '',
        visibleRsvpFields: event.rsvpFormFields?.visible || [],
        requiredRsvpFields: event.rsvpFormFields?.required || [],
        
        // Content
        images: event.images || [],
        profiles: mapSpeakersToProfiles(event.speakers || [], locale),
        communityForumUrl: cta?.url || '',
        secondaryLinkTitle: cta?.label || '',
        agendaItems: agendaItems,
        showAgendaPostEvent: event.showAgendaPostEvent || false,
        sponsors: mapSponsorsToFormData(event.sponsors || [], locale)
      })
    } catch (err) {
      console.error('Failed to load event:', err)
      setError('Failed to load event data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Prepare the data for API (convert comprehensive form data to basic Event API format)
      // The backend expects the basic EventFormData format
      const basicEventData = {
        name: formData.name,
        description: formData.description,
        seriesId: formData.seriesId,
        organizationId: formData.organizationId,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        location: formData.venue?.formattedAddress || '',
        capacity: formData.capacity,
        status: formData.status,
        registrationOpen: formData.registrationOpen,
        metadata: {
          cloudType: formData.cloudType,
          urlTitle: formData.urlTitle,
          shortDescription: formData.shortDescription,
          language: formData.language,
          isPrivate: formData.isPrivate,
          tags: formData.tags,
          timezone: formData.timezone,
          venue: formData.venue,
          allowWaitlist: formData.allowWaitlist,
          allowGuestRegistration: formData.allowGuestRegistration,
          hostEmail: formData.hostEmail,
          rsvpDescription: formData.rsvpDescription,
          registrationType: formData.registrationType,
          marketoFormUrl: formData.marketoFormUrl,
          visibleRsvpFields: formData.visibleRsvpFields,
          requiredRsvpFields: formData.requiredRsvpFields,
          images: formData.images,
          profiles: formData.profiles,
          communityForumUrl: formData.communityForumUrl,
          secondaryLinkTitle: formData.secondaryLinkTitle,
          agendaItems: formData.agendaItems,
          showAgendaPostEvent: formData.showAgendaPostEvent,
          sponsors: formData.sponsors
        }
      }

      if (isEditMode && id) {
        await apiService.updateEvent(id, basicEventData as any)
      } else {
        await apiService.createEvent(basicEventData as any)
      }
      
      setSuccess(true)
      setTimeout(() => {
        navigate('/resources')
      }, 1500)
    } catch (err) {
      console.error('Failed to save event:', err)
      setError(err instanceof Error ? err.message : 'Failed to save event')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/events')
  }

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const updateVenueData = (updates: Partial<VenueData>) => {
    setFormData((prev) => ({
      ...prev,
      venue: { ...prev.venue!, ...updates }
    }))
  }

  // Get feature flags based on event type (centralized config)
  const { hasVenue, hasPageMetadata } = useEventFeatureFlags(formData.eventType)

  // Profile management
  const addProfile = () => {
    const newProfile: ProfileData = {
      type: 'speaker',
      firstName: '',
      lastName: '',
      title: '',
      bio: '',
      socialLinks: []
    }
    setFormData((prev) => ({
      ...prev,
      profiles: [...(prev.profiles || []), newProfile]
    }))
  }

  const updateProfile = (index: number, updates: Partial<ProfileData>) => {
    setFormData((prev) => {
      const profiles = [...(prev.profiles || [])]
      profiles[index] = { ...profiles[index], ...updates }
      return { ...prev, profiles }
    })
  }

  const removeProfile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      profiles: (prev.profiles || []).filter((_, i) => i !== index)
    }))
  }

  // Social links management
  const addSocialLink = (profileIndex: number) => {
    setFormData((prev) => {
      const profiles = [...(prev.profiles || [])]
      const profile = profiles[profileIndex]
      profile.socialLinks = [...(profile.socialLinks || []), { url: '' }]
      return { ...prev, profiles }
    })
  }

  const updateSocialLink = (profileIndex: number, linkIndex: number, url: string) => {
    setFormData((prev) => {
      const profiles = [...(prev.profiles || [])]
      const profile = profiles[profileIndex]
      const socialLinks = [...(profile.socialLinks || [])]
      
      // Detect platform from URL
      const platform = detectSocialPlatform(url)
      socialLinks[linkIndex] = {
        url,
        platform: platform?.name
      }
      
      profile.socialLinks = socialLinks
      return { ...prev, profiles }
    })
  }

  const removeSocialLink = (profileIndex: number, linkIndex: number) => {
    setFormData((prev) => {
      const profiles = [...(prev.profiles || [])]
      const profile = profiles[profileIndex]
      profile.socialLinks = (profile.socialLinks || []).filter((_, i) => i !== linkIndex)
      return { ...prev, profiles }
    })
  }

  // Sponsor management
  const addSponsor = () => {
    const newSponsor: SponsorData = {
      id: `sponsor-${Date.now()}`,
      partnerName: '',
      partnerUrl: '',
      isSaved: false
    }
    setFormData((prev) => ({
      ...prev,
      sponsors: [...(prev.sponsors || []), newSponsor]
    }))
  }

  const updateSponsor = (index: number, updates: Partial<SponsorData>) => {
    setFormData((prev) => {
      const sponsors = [...(prev.sponsors || [])]
      sponsors[index] = { ...sponsors[index], ...updates, isSaved: false }
      return { ...prev, sponsors }
    })
  }

  const saveSponsor = async (index: number) => {
    // Mark sponsor as saved (in real implementation, this would save to backend)
    setFormData((prev) => {
      const sponsors = [...(prev.sponsors || [])]
      sponsors[index] = { ...sponsors[index], isSaved: true }
      return { ...prev, sponsors }
    })
    
    // You can add actual save logic here if needed
    console.log('Sponsor saved:', formData.sponsors?.[index])
  }

  const removeSponsor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sponsors: (prev.sponsors || []).filter((_, i) => i !== index)
    }))
  }

  // ============================================================
  // STEP 1: Basic Info
  // Contains: Event Format, Tags, Event Info, Date/Time, Venue
  // ============================================================
  const step1IsValid =
    formData.seriesId !== '' &&
    formData.name.trim() !== '' &&
    formData.language !== '' &&
    Boolean(formData.shortDescription && formData.shortDescription.trim() !== '') &&
    formData.startDateTime !== '' &&
    formData.endDateTime !== '' &&
    formData.venue?.venueName.trim() !== ''

  const step1Component = (
    <Flex direction="column" gap="size-0">
      {/* Event Format Component */}
      <FormCard>
        <EventFormatComponent
          cloudType={formData.cloudType}
          seriesId={formData.seriesId}
          onChange={(data: { cloudType?: string; seriesId?: string }) => {
            if (data.cloudType !== undefined) {
              updateFormData({ cloudType: data.cloudType as 'CreativeCloud' | 'ExperienceCloud' })
            }
            if (data.seriesId !== undefined) {
              updateFormData({ seriesId: data.seriesId })
            }
          }}
        />
      </FormCard>

      {/* Event Topics/Tags Component */}
      <FormCard>
        <EventTagsComponent
            selectedTags={formData.tags || []}
            onChange={(tags) => updateFormData({ tags })}
          />
      </FormCard>

      {/* Event Information Component */}
      <FormCard>
        <EventInfoComponent
          language={formData.language}
          name={formData.name}
          urlTitle={formData.urlTitle || ''}
          description={formData.description || ''}
          shortDescription={formData.shortDescription || ''}
          startDateTime={formData.startDateTime}
          endDateTime={formData.endDateTime}
          timezone={formData.timezone || ''}
          communityForumUrl={formData.communityForumUrl || ''}
          secondaryLinkTitle={formData.secondaryLinkTitle || ''}
          isPrivate={formData.isPrivate}
          onChange={(data) => updateFormData(data)}
        />
      </FormCard>

      {/* Agenda Component */}
      <FormCard>
        <AgendaComponent
          agendaItems={formData.agendaItems || []}
          showAgendaPostEvent={formData.showAgendaPostEvent}
          eventStartDateTime={formData.startDateTime}
          eventEndDateTime={formData.endDateTime}
          onChange={(agendaItems) => updateFormData({ agendaItems })}
          onShowAgendaPostEventChange={(value) => updateFormData({ showAgendaPostEvent: value })}
        />
      </FormCard>

      {/* Venue Information Component - Only for In-Person events */}
      {hasVenue && (
        <FormCard>
          <VenueComponent
            venue={formData.venue!}
            eventId={id}
            onChange={updateVenueData}
          />
        </FormCard>
      )}

      {/* Page Metadata Component - Only for Webinar events */}
      {hasPageMetadata && (
        <FormCard>
          <PageMetadataComponent
            metadata={formData.metadata || {}}
            onChange={(metadata) => updateFormData({ metadata })}
          />
        </FormCard>
      )}
    </Flex>
  )

  // ============================================================
  // STEP 2: Speakers & Hosts
  // ============================================================
  const step2Component = (
    <FormCard>
      <ProfilesComponent
        profiles={formData.profiles || []}
        eventId={id}
        onAddProfile={addProfile}
        onRemoveProfile={removeProfile}
        onUpdateProfile={updateProfile}
        onAddSocialLink={addSocialLink}
        onRemoveSocialLink={removeSocialLink}
        onUpdateSocialLink={updateSocialLink}
      />
    </FormCard>
  )

  // ============================================================
  // STEP 3: Additional Content (Images & Sponsors)
  // ============================================================
  const step3Component = (
    <>
      {/* Sponsors Section */}
    <FormCard>
        <SponsorsComponent
          sponsors={formData.sponsors || []}
          eventId={id}
          onAddSponsor={addSponsor}
          onRemoveSponsor={removeSponsor}
          onUpdateSponsor={updateSponsor}
          onSaveSponsor={saveSponsor}
        />
      </FormCard>

      {/* Event Images Section */}
      <FormCard>
        <EventImagesComponent
          images={formData.images || []}
          eventId={id}
          onUpdateImages={(images) => updateFormData({ images })}
        />
    </FormCard>
    </>
  )

  // ============================================================
  // STEP 4: RSVP (Attendance & Registration) - Cloud-Specific
  // ============================================================
  const step4Component = (
    <FormCard>
      <RegistrationConfigComponent
        cloudType={formData.cloudType || 'CreativeCloud'}
        venueName={formData.venue?.venueName}
        capacity={formData.capacity}
        allowWaitlist={formData.allowWaitlist}
        allowGuestRegistration={formData.allowGuestRegistration}
        hostEmail={formData.hostEmail}
        rsvpDescription={formData.rsvpDescription}
        registrationType={formData.registrationType}
        marketoFormUrl={formData.marketoFormUrl}
        visibleRsvpFields={formData.visibleRsvpFields}
        requiredRsvpFields={formData.requiredRsvpFields}
        onCapacityChange={(value) => updateFormData({ capacity: value })}
        onAllowWaitlistChange={(value) => updateFormData({ allowWaitlist: value })}
        onAllowGuestRegistrationChange={(value) => updateFormData({ allowGuestRegistration: value })}
        onHostEmailChange={(value) => updateFormData({ hostEmail: value })}
        onRsvpDescriptionChange={(value) => updateFormData({ rsvpDescription: value })}
        onRegistrationTypeChange={(type) => updateFormData({ registrationType: type })}
        onMarketoFormUrlChange={(url) => updateFormData({ marketoFormUrl: url })}
        onVisibleFieldsChange={(fields) => updateFormData({ visibleRsvpFields: fields })}
        onRequiredFieldsChange={(fields) => updateFormData({ requiredRsvpFields: fields })}
      />
    </FormCard>
  )


  // ============================================================
  // Wizard Steps Configuration (Matching v1 Reference Structure)
  // ============================================================
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
      isValid: true // Optional step
    },
    {
      id: 'additional-content',
      title: 'Additional Content',
      description: 'Add event images and visual content (optional)',
      component: step3Component,
      isValid: true // Optional step
    },
    {
      id: 'rsvp',
      title: 'RSVP',
      description: 'Configure attendance capacity and registration settings',
      component: step4Component,
      isValid: true // All fields optional or have defaults
    }
  ]

  if (isLoading) {
    return <LoadingSpinner message="Loading event data..." />
  }

  return (
    <View 
      UNSAFE_style={{
        backgroundColor: 'var(--spectrum-global-color-gray-100)',
      }}
    >
      {error && (
        <View
          padding="size-200"
          backgroundColor="negative"
          borderRadius="medium"
          margin="size-300"
        >
          <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
        </View>
      )}

      {success && (
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
