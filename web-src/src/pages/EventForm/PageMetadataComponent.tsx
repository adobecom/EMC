/* 
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Picker, PickerItem, Text, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { apiService, cachedApi } from '../../services/api'
import { PublishingProfile } from '../../types/domain'

interface MetadataField {
  key: string
  name: string
}

interface MetadataOption {
  value: string
}

interface MetadataCatalogue {
  data: {
    data: MetadataField[]
  }
  [key: string]: any
}

const METADATA_CATALOGUE_URL = 'https://www.adobe.com/event-libs/assets/configs/metadata-catalogue.json'

/**
 * PageMetadataComponent - Manages page metadata for webinar events
 * 
 * Uses EventFormContext for state management.
 * Fetches metadata catalogue from external URL.
 * Loads/saves metadata via PublishingProfile API.
 */
export const PageMetadataComponent: React.FC = () => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [catalogue, setCatalogue] = useState<MetadataCatalogue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track the current publishing profile for updates
  const publishingProfileRef = useRef<PublishingProfile | null>(null)
  
  // Ref to hold updateFormData for use in callbacks (avoids circular dependency)
  const updateFormDataRef = useRef<((updates: any) => void) | null>(null)
  
  // Keep a ref to formData for use in callbacks
  const formDataRef = useRef<any>(null)
  
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
    isEditMode,
  } = useEventFormComponent({
    componentId: 'page-metadata',
    onLoadResponse: async (eventResponse: any) => {
      // Load the event's publishing profile when event data is loaded
      if (!eventResponse?.eventId) return
      
      try {
        const profileResponse = await cachedApi.getEventPublishingProfile(eventResponse.eventId)
        
        // Response could be an array or single object
        const profiles = Array.isArray(profileResponse) ? profileResponse : [profileResponse]
        const profileAssociation = profiles[0]
        
        if (profileAssociation && !('error' in profileAssociation)) {
          // API returns { eventId, profileId, profile: { metadata, ... } }
          // The actual profile data is nested inside the 'profile' property
          const actualProfile = profileAssociation.profile || profileAssociation
          
          publishingProfileRef.current = actualProfile as PublishingProfile
          // Populate form data with the profile's metadata
          if (actualProfile.metadata && updateFormDataRef.current) {
            updateFormDataRef.current({ metadata: actualProfile.metadata })
          }
        }
      } catch (err) {
        console.error('Failed to load publishing profile:', err)
        // Non-fatal - profile may not exist yet
      }
    },
    onAfterSave: async (eventId: string) => {
      // Save/update the publishing profile after the event is saved
      const currentMetadata = formDataRef.current?.metadata
      if (!currentMetadata || Object.keys(currentMetadata).length === 0) {
        return // Nothing to save
      }
      
      try {
        const existingProfile = publishingProfileRef.current
        
        if (existingProfile?.profileId) {
          // Update existing profile
          await apiService.updatePublishingProfile(existingProfile.profileId, {
            name: existingProfile.name,
            description: existingProfile.description,
            metadata: currentMetadata,
            modificationTime: existingProfile.modificationTime,
          })
        } else {
          // Create new profile and assign to event
          const createResult = await apiService.createPublishingProfile({
            name: `Event ${eventId} Profile`,
            metadata: currentMetadata,
          })
          
          if (createResult && !('error' in createResult) && createResult.profileId) {
            // Assign the new profile to the event
            await apiService.assignPublishingProfileToEvent(eventId, createResult.profileId)
            publishingProfileRef.current = createResult as PublishingProfile
          }
        }
      } catch (err) {
        console.error('Failed to save publishing profile:', err)
        // Don't throw - we don't want to fail the entire save
      }
    },
  })
  
  // Update refs when values change
  useEffect(() => {
    updateFormDataRef.current = updateFormData
  }, [updateFormData])
  
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])
  
  const metadata = formData.metadata || {}
  
  // ============================================================================
  // LOAD PUBLISHING PROFILE ON EDIT MODE
  // ============================================================================
  
  const loadPublishingProfile = useCallback(async (targetEventId: string) => {
    if (!targetEventId) return
    
    try {
      const profileResponse = await cachedApi.getEventPublishingProfile(targetEventId)
      
      // Response could be an array or single object
      const profiles = Array.isArray(profileResponse) ? profileResponse : [profileResponse]
      const profileAssociation = profiles[0]
      
      if (profileAssociation && !('error' in profileAssociation)) {
        // API returns { eventId, profileId, profile: { metadata, ... } }
        // The actual profile data is nested inside the 'profile' property
        const actualProfile = profileAssociation.profile || profileAssociation
        
        publishingProfileRef.current = actualProfile as PublishingProfile
        // Populate form data with the profile's metadata
        if (actualProfile.metadata) {
          updateFormData({ metadata: actualProfile.metadata })
        }
      }
    } catch (err) {
      console.error('Failed to load publishing profile:', err)
      // Non-fatal - profile may not exist yet
    }
  }, [updateFormData])
  
  useEffect(() => {
    // If we're in edit mode and have an eventId, load the publishing profile
    if (isEditMode && eventId && !publishingProfileRef.current) {
      loadPublishingProfile(eventId)
    }
  }, [isEditMode, eventId, loadPublishingProfile])

  // ============================================================================
  // DATA LOADING (Catalogue)
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const fetchCatalogue = async () => {
      try {
        const response = await fetch(METADATA_CATALOGUE_URL)
        if (!response.ok) {
          throw new Error('Failed to fetch metadata catalogue')
        }
        const data = await response.json()
        
        if (isMounted) {
          setCatalogue(data)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error fetching metadata catalogue:', err)
        if (isMounted) {
          setError('Failed to load metadata options')
          setIsLoading(false)
        }
      }
    }

    fetchCatalogue()

    return () => {
      isMounted = false
    }
  }, [])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFieldChange = (fieldKey: string, value: string) => {
    const updatedMetadata = { ...metadata }
    
    if (value && !value.startsWith('No ')) {
      updatedMetadata[fieldKey] = value
    } else {
      delete updatedMetadata[fieldKey]
    }
    
    updateFormData({ metadata: updatedMetadata })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text>Loading metadata options...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text UNSAFE_style={{ color: COLORS.STATUS_CANCELLED }}>
          {error}
        </Text>
      </div>
    )
  }

  const fields = catalogue?.data?.data || []

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Page metadata management
        </Heading>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Configure tracking and metadata settings for your event. Set your primary product name 
          to ensure accurate analytics tracking and reporting for your webinar event page.
        </Text>
      </div>

      {fields.map((field: MetadataField) => {
        const fieldOptions: MetadataOption[] = catalogue?.[field.key]?.data || []
        const currentValue = metadata[field.key] || ''
        
        const allOptions = [
          { key: `no-${field.key}`, label: `No ${field.name}` },
          ...fieldOptions.map(opt => ({ key: opt.value, label: opt.value }))
        ]

        return (
          <Picker
            key={field.key}
            data-testid={`meta-${field.key}-input`}
            label={`${field.name} *`}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKey={currentValue || `no-${field.key}`}
            onSelectionChange={(key) => handleFieldChange(field.key, key as string)}
            isRequired
            items={allOptions}
          >
            {(item) => <PickerItem id={item.key}>{item.label}</PickerItem>}
          </Picker>
        )
      })}
    </div>
  )
}
