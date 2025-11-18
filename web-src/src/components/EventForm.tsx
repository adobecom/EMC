/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  TextArea,
  Picker,
  Item,
  DatePicker,
  NumberField,
  Switch,
  Checkbox,
  Flex,
  Heading,
  Text,
  Button,
  Divider,
  TooltipTrigger,
  Tooltip,
  ActionButton,
  ComboBox
} from '@adobe/react-spectrum'
import { getTimeZones } from '@vvo/tzdb'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EventFormData,
  ProfileData,
  VenueData
} from '../types/domain'
import { apiService } from '../services/api'
import { IMS } from '../types'
import { FormWizard, WizardStep, LoadingSpinner, FormCard, RichTextEditor, TagSelector, HeadingWithTooltip } from './shared'
import { parseDateTime } from '@internationalized/date'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import Info from '@spectrum-icons/workflow/Info'
import { EventFormatComponent } from './EventForm/EventFormatComponent'

interface EventFormProps {
  ims: IMS
}

// Language options for event localization
const LANGUAGE_OPTIONS = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Spanish' },
  { key: 'fr', label: 'French' },
  { key: 'de', label: 'German' },
  { key: 'ja', label: 'Japanese' },
  { key: 'ko', label: 'Korean' },
  { key: 'pt', label: 'Portuguese' },
  { key: 'zh', label: 'Chinese' }
]

// Timezone options from @vvo/tzdb
const TIMEZONE_OPTIONS = getTimeZones().map((tz) => ({
  id: tz.name,
  name: `${tz.name} (${tz.currentTimeFormat})`
}))

export const EventForm: React.FC<EventFormProps> = ({ ims }) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id

  // Form data state
  const [formData, setFormData] = useState<EventFormData>({
    cloudType: 'CreativeCloud',
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
    images: [],
    profiles: [],
    communityForumUrl: '',
    secondaryLinkTitle: ''
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasSecondaryLink, setHasSecondaryLink] = useState(false)

  useEffect(() => {
    if (isEditMode && id) {
      loadEvent(id)
    }
  }, [id])

  // Set hasSecondaryLink based on whether we have a secondary link URL
  useEffect(() => {
    if (formData.communityForumUrl) {
      setHasSecondaryLink(true)
    }
  }, [formData.communityForumUrl])

  const loadEvent = async (eventId: string) => {
    setIsLoading(true)
    try {
      const response = await apiService.getEvent(eventId)
      if (response.success && response.data) {
        const event = response.data
        
        // Map the loaded event to form data
        setFormData({
          cloudType: (event.metadata?.cloudType as 'CreativeCloud' | 'ExperienceCloud') || 'CreativeCloud',
          seriesId: event.seriesId,
          organizationId: event.organizationId,
          name: event.name,
          urlTitle: event.metadata?.urlTitle || '',
          description: event.description,
          shortDescription: event.metadata?.shortDescription || '',
          language: event.metadata?.language || 'en',
          isPrivate: event.metadata?.isPrivate || false,
          tags: event.metadata?.tags || [],
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          timezone: event.metadata?.timezone,
          venue: event.metadata?.venue || formData.venue,
          capacity: event.capacity,
          status: event.status,
          registrationOpen: event.registrationOpen,
          allowWaitlist: event.metadata?.allowWaitlist || false,
          allowGuestRegistration: event.metadata?.allowGuestRegistration || false,
          images: event.metadata?.images || [],
          profiles: event.metadata?.profiles || [],
          communityForumUrl: event.metadata?.communityForumUrl || '',
          secondaryLinkTitle: event.metadata?.secondaryLinkTitle || ''
        })
      }
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
          images: formData.images,
          profiles: formData.profiles,
          communityForumUrl: formData.communityForumUrl,
          secondaryLinkTitle: formData.secondaryLinkTitle
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
    navigate('/resources')
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
    <View>
          <Heading level={3}>Tags & Topics</Heading>
          <Text marginBottom="size-200">
            Choose one or more tags from the Adobe CAAS taxonomy. This will add metadata to your event for better discoverability.
          </Text>
          
          <TagSelector
            selectedTags={formData.tags || []}
            onChange={(tags) => updateFormData({ tags })}
            description="Search and select tags to categorize your event"
          />
        </View>
      </FormCard>

      {/* Event Information Component */}
      <FormCard>
        <Flex direction="column" gap="size-200">
          {/* Header Row: Title with tooltip on left, private toggle on right */}
          <Flex direction="row" justifyContent="space-between" alignItems="center">
            <HeadingWithTooltip 
              level={3}
              tooltip="Give your event a title, description, dates, and start/end times. If you have a related forum on community.adobe.com, create a CTA to it here."
            >
              Event Information
            </HeadingWithTooltip>
            
            <Flex direction="row" alignItems="center" gap="size-100">
              <Switch
                isSelected={formData.isPrivate}
                onChange={(value) => updateFormData({ isPrivate: value })}
              >
                Set as a private event
              </Switch>
              <TooltipTrigger delay={0}>
                <ActionButton 
                  isQuiet 
                  UNSAFE_style={{ 
                    minWidth: 'auto',
                    padding: 0,
                    width: '20px',
                    height: '20px'
                  }}
                >
                  <Info size="S" />
                </ActionButton>
                <Tooltip variant="info">By setting this to private, your event won't be publicly found online or published to the events hub.</Tooltip>
              </TooltipTrigger>
            </Flex>
          </Flex>

          <Picker
            label="Language"
            isRequired
            selectedKey={formData.language}
            onSelectionChange={(key) => updateFormData({ language: String(key) })}
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <Item key={lang.key}>{lang.label}</Item>
            ))}
          </Picker>

          <TextField
            label="Event Title"
            isRequired
            isQuiet
            maxLength={80}
            value={formData.name}
            onChange={(value) => {
              // Check if old event title matches current URL title
              if (formData.name === formData.urlTitle) {
                // They match, so sync is active - update both fields
                updateFormData({ name: value, urlTitle: value })
              } else {
                // They don't match, so don't sync - only update event title
                updateFormData({ name: value })
              }
            }}
            description="80 characters max"
            width="100%"
          />

          <View width="100%">
            <Flex direction="row" gap="size-100" alignItems="center" marginBottom="size-100">
              <Text>English title for page URL</Text>
              <TooltipTrigger delay={0}>
                <ActionButton 
                  isQuiet 
                  UNSAFE_style={{ 
                    minWidth: 'auto',
                    padding: 0,
                    width: '20px',
                    height: '20px'
                  }}
                >
                  <Info size="S" />
                </ActionButton>
                <Tooltip variant="info">SEO friendly title</Tooltip>
              </TooltipTrigger>
            </Flex>
            <TextField
              isQuiet
              placeholder="Add event title for page URL"
              value={formData.urlTitle || ''}
              onChange={(value) => updateFormData({ urlTitle: value })}
              width="100%"
            />
          </View>

          <View width="100%">
            <HeadingWithTooltip 
              level={4}
              tooltip="Add rich text to your event description. This will be the copy displayed on the event page."
              marginBottom="size-100"
            >
              Event Details
            </HeadingWithTooltip>
            <RichTextEditor
              label=""
              value={formData.description || ''}
              onChange={(value) => updateFormData({ description: value })}
              height="400px"
            />
          </View>

          <TextArea
            label="Event Description for Events Hub and SEO"
            isRequired
            maxLength={160}
            value={formData.shortDescription || ''}
            onChange={(value) => updateFormData({ shortDescription: value })}
            description="160 characters max"
            width="100%"
          />

          <Flex direction="row" gap="size-200" wrap>
            <DatePicker
              label="Start Date & Time"
              isRequired
              granularity="minute"
              value={formData.startDateTime ? parseDateTime(formData.startDateTime) : null}
              onChange={(date) => updateFormData({ startDateTime: date?.toString() || '' })}
            />

            <DatePicker
              label="End Date & Time"
              isRequired
              granularity="minute"
              value={formData.endDateTime ? parseDateTime(formData.endDateTime) : null}
              onChange={(date) => updateFormData({ endDateTime: date?.toString() || '' })}
              minValue={formData.startDateTime ? parseDateTime(formData.startDateTime) : undefined}
            />

            <ComboBox
              label="Timezone (Optional)"
              items={TIMEZONE_OPTIONS}
              selectedKey={formData.timezone || null}
              onSelectionChange={(key) => updateFormData({ timezone: key ? String(key) : '' })}
              description="Search and select a timezone"
              menuTrigger="focus"
            >
              {(item) => <Item key={item.id}>{item.name}</Item>}
            </ComboBox>
          </Flex>

          <Switch
            isSelected={hasSecondaryLink}
            onChange={(value) => {
              setHasSecondaryLink(value)
              if (!value) {
                // Clear fields when disabling
                updateFormData({ communityForumUrl: '', secondaryLinkTitle: '' })
              }
            }}
          >
            Add secondary link
          </Switch>

          {hasSecondaryLink && (
            <>
              <TextField
                label="Secondary Link Title"
                isQuiet
                value={formData.secondaryLinkTitle || ''}
                onChange={(value) => updateFormData({ secondaryLinkTitle: value })}
                description="Display text for the secondary link"
                width="100%"
              />

              <TextField
                label="Secondary Link URL"
                type="url"
                isQuiet
                value={formData.communityForumUrl || ''}
                onChange={(value) => updateFormData({ communityForumUrl: value })}
                description="URL for the secondary link"
                width="100%"
              />
            </>
          )}
        </Flex>
      </FormCard>

      {/* Venue Information Component */}
      <FormCard>
        <View>
        <Heading level={3}>Venue Information</Heading>

        <TextField
          label="Venue Name"
          isRequired
          isQuiet
          maxLength={80}
          value={formData.venue?.venueName || ''}
          onChange={(value) => updateVenueData({ venueName: value })}
          description="80 characters max"
        />

        <TextField
          label="Venue Address"
          isQuiet
          value={formData.venue?.formattedAddress || ''}
          onChange={(value) => updateVenueData({ formattedAddress: value })}
          description="Full address of the venue"
        />

        <RichTextEditor
          label="Venue Additional Information (Optional)"
          value={formData.venue?.additionalInformation || ''}
          onChange={(value) => updateVenueData({ additionalInformation: value })}
          height="250px"
          description="Additional details about the venue"
        />

        <Checkbox
          isSelected={formData.venue?.showVenuePostEvent || false}
          onChange={(value) => updateVenueData({ showVenuePostEvent: value })}
        >
          Venue info will appear post-event
        </Checkbox>

        <Checkbox
          isSelected={formData.venue?.showAdditionalInfoPostEvent || false}
          onChange={(value) => updateVenueData({ showAdditionalInfoPostEvent: value })}
        >
          Venue additional info will appear post-event
        </Checkbox>
        </View>
      </FormCard>
    </Flex>
  )

  // ============================================================
  // STEP 2: Speakers & Hosts
  // ============================================================
  const step2Component = (
    <FormCard>
      <Flex direction="column" gap="size-200">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3}>Speakers & Hosts</Heading>
        <Button variant="primary" onPress={addProfile}>
          <Add />
          <Text>Add Profile</Text>
        </Button>
      </Flex>

      <Text>Add speaker and event host details. Profiles will appear in the order they were entered.</Text>

      {(!formData.profiles || formData.profiles.length === 0) && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No speakers or hosts added yet. Click "Add Profile" to add one.</Text>
        </View>
      )}

      {formData.profiles && formData.profiles.map((profile, index) => (
        <View key={index} padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
          <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
            <Heading level={4}>Profile {index + 1}</Heading>
            <Button variant="negative" onPress={() => removeProfile(index)} isQuiet>
              <Delete />
            </Button>
          </Flex>

          <Flex direction="column" gap="size-150">
            <Picker
              label="Profile Type"
              selectedKey={profile.type}
              onSelectionChange={(key) => updateProfile(index, { type: key as 'speaker' | 'host' })}
            >
              <Item key="speaker">Speaker</Item>
              <Item key="host">Host</Item>
            </Picker>

            <Flex direction="row" gap="size-150">
              <TextField
                label="First Name"
                isQuiet
                value={profile.firstName}
                onChange={(value) => updateProfile(index, { firstName: value })}
                width="50%"
              />
              <TextField
                label="Last Name"
                isQuiet
                value={profile.lastName}
                onChange={(value) => updateProfile(index, { lastName: value })}
                width="50%"
              />
            </Flex>

            <TextField
              label="Title"
              isQuiet
              value={profile.title}
              onChange={(value) => updateProfile(index, { title: value })}
            />

            <RichTextEditor
              label="Bio (Optional)"
              value={profile.bio || ''}
              onChange={(value) => updateProfile(index, { bio: value })}
              height="200px"
      />

      <TextField
              label="Image URL (Optional)"
              isQuiet
              value={profile.imageUrl || ''}
              onChange={(value) => updateProfile(index, { imageUrl: value })}
            />
          </Flex>
        </View>
      ))}
      </Flex>
    </FormCard>
  )

  // ============================================================
  // STEP 3: Additional Content (Images)
  // ============================================================
  const step3Component = (
    <FormCard>
      <Flex direction="column" gap="size-200">
      <Heading level={3}>Event Images</Heading>
      <Text>
        Add images for your event. You can add an event card image, hero image, and venue image.
      </Text>

      <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
        <Heading level={4}>Event Card Image</Heading>
        <TextField
          label="Image URL"
          isQuiet
          value={formData.images?.find((img) => img.imageKind === 'event-card-image')?.imageUrl || ''}
          onChange={(value) => {
            const images = formData.images || []
            const existingIndex = images.findIndex((img) => img.imageKind === 'event-card-image')
            
            if (existingIndex >= 0) {
              images[existingIndex].imageUrl = value
            } else {
              images.push({ imageKind: 'event-card-image', imageUrl: value })
            }
            
            updateFormData({ images: [...images] })
          }}
        />
      </View>

      <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
        <Heading level={4}>Event Hero Image</Heading>
        <TextField
          label="Image URL"
          isQuiet
          value={formData.images?.find((img) => img.imageKind === 'event-hero-image')?.imageUrl || ''}
          onChange={(value) => {
            const images = formData.images || []
            const existingIndex = images.findIndex((img) => img.imageKind === 'event-hero-image')
            
            if (existingIndex >= 0) {
              images[existingIndex].imageUrl = value
            } else {
              images.push({ imageKind: 'event-hero-image', imageUrl: value })
            }
            
            updateFormData({ images: [...images] })
          }}
        />
      </View>

      <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
        <Heading level={4}>Venue Image</Heading>
        <TextField
          label="Image URL"
          isQuiet
          value={formData.images?.find((img) => img.imageKind === 'venue-image')?.imageUrl || ''}
          onChange={(value) => {
            const images = formData.images || []
            const existingIndex = images.findIndex((img) => img.imageKind === 'venue-image')
            
            if (existingIndex >= 0) {
              images[existingIndex].imageUrl = value
            } else {
              images.push({ imageKind: 'venue-image', imageUrl: value })
            }
            
            updateFormData({ images: [...images] })
          }}
      />
    </View>
      </Flex>
    </FormCard>
  )

  // ============================================================
  // STEP 4: RSVP (Attendance & Registration)
  // ============================================================
  const step4Component = (
    <FormCard>
      <Flex direction="column" gap="size-200">
      <Heading level={3}>Attendance</Heading>

      <NumberField
        label="Attendance Capacity (Optional)"
        value={formData.capacity || 0}
        onChange={(value) => updateFormData({ capacity: value })}
        minValue={0}
        description="Maximum number of attendees (0 = unlimited)"
      />

      <Divider size="M" />

      <Heading level={3}>Registration Settings</Heading>

      <Switch
        isSelected={formData.registrationOpen}
        onChange={(value) => updateFormData({ registrationOpen: value })}
      >
        Registration Open
      </Switch>

      <Switch
        isSelected={formData.allowWaitlist || false}
        onChange={(value) => updateFormData({ allowWaitlist: value })}
      >
        Allow Waitlisting
      </Switch>

      <Switch
        isSelected={formData.allowGuestRegistration || false}
        onChange={(value) => updateFormData({ allowGuestRegistration: value })}
      >
        Allow Guest Registration
      </Switch>

      <Picker
        label="Event Status"
        isRequired
        selectedKey={formData.status}
        onSelectionChange={(key) => updateFormData({ status: key as EventFormData['status'] })}
      >
        <Item key="draft">Draft</Item>
        <Item key="published">Published</Item>
        <Item key="ongoing">Ongoing</Item>
        <Item key="completed">Completed</Item>
        <Item key="cancelled">Cancelled</Item>
      </Picker>
      </Flex>
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
        marginLeft: '-24px',
        marginRight: '-24px',
        marginTop: '-24px',
        marginBottom: '-24px',
        paddingBottom: '24px'
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
