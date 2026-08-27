/* 
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Picker, PickerItem, Text, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { useEventFormContext } from '../../contexts/EventFormContext'
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

function noOptionKey(fieldKey: string): string {
  return `no-${fieldKey}`
}

function catalogueFieldKeys(cat: MetadataCatalogue | null): string[] {
  const fields = cat?.data?.data
  if (!fields?.length) return []
  return (fields as MetadataField[]).map((f) => f.key)
}

/** ESP may return profileId on the association object while nested `profile` omits it. */
function publishingProfileFromAssociation(profileAssociation: {
  profile?: PublishingProfile
  profileId?: string
  [key: string]: unknown
}): PublishingProfile {
  const inner = (profileAssociation.profile ?? profileAssociation) as PublishingProfile
  const topId = profileAssociation.profileId
  if (typeof topId === 'string' && topId && !inner.profileId) {
    return { ...inner, profileId: topId }
  }
  return inner
}

/**
 * PageMetadataComponent - Manages page metadata for webinar events
 * 
 * Uses EventFormContext for state management.
 * Fetches metadata catalogue from external URL.
 * Loads/saves metadata via PublishingProfile API.
 */
export const PageMetadataComponent: React.FC = () => {
  const { isEditMode } = useEventFormContext()

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [catalogue, setCatalogue] = useState<MetadataCatalogue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Catalogue arrived after publishing profile metadata was merged — flush acknowledgments once */
  const [pendingProfileAckBackfill, setPendingProfileAckBackfill] = useState(false)

  // Track the current publishing profile for updates
  const publishingProfileRef = useRef<PublishingProfile | null>(null)
  const catalogueRef = useRef<MetadataCatalogue | null>(null)

  // Ref to hold updateFormData for use in callbacks (avoids circular dependency)
  const updateFormDataRef = useRef<((updates: any) => void) | null>(null)

  // Keep a ref to formData for use in callbacks
  const formDataRef = useRef<any>(null)

  const mergeAckForCatalogueKeys = useCallback(
    (prevAck: Record<string, boolean>, keys: string[]): Record<string, boolean> => ({
      ...prevAck,
      ...Object.fromEntries(keys.map((k) => [k, true])),
    }),
    []
  )

  /** Apply association from GET publishing profile: metadata (if present) + acknowledgments when catalogue keys are known. */
  const applyPublishingProfileFromServer = useCallback(
    (actualProfile: PublishingProfile) => {
      publishingProfileRef.current = actualProfile

      const keys = catalogueFieldKeys(catalogueRef.current)
      const prevAck = (formDataRef.current?.metadataFieldAcknowledged || {}) as Record<string, boolean>

      if (keys.length > 0) {
        const updates: Record<string, unknown> = {
          metadataFieldAcknowledged: mergeAckForCatalogueKeys(prevAck, keys),
        }
        if (actualProfile.metadata != null) {
          updates.metadata = actualProfile.metadata
        }
        updateFormDataRef.current?.(updates)
        setPendingProfileAckBackfill(false)
      } else {
        if (actualProfile.metadata != null) {
          updateFormDataRef.current?.({ metadata: actualProfile.metadata })
        }
        setPendingProfileAckBackfill(true)
      }
    },
    [mergeAckForCatalogueKeys]
  )

  /** After profile save/create: keep acknowledgments aligned with catalogue (same intent as prior hydration tick). */
  const syncAcknowledgmentsAfterProfileSave = useCallback(() => {
    const keys = catalogueFieldKeys(catalogueRef.current)
    const prevAck = (formDataRef.current?.metadataFieldAcknowledged || {}) as Record<string, boolean>
    if (keys.length > 0) {
      updateFormDataRef.current?.({
        metadataFieldAcknowledged: mergeAckForCatalogueKeys(prevAck, keys),
      })
      setPendingProfileAckBackfill(false)
    } else {
      setPendingProfileAckBackfill(true)
    }
  }, [mergeAckForCatalogueKeys])
  
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
  } = useEventFormComponent({
    componentId: 'page-metadata',
    onLoadResponse: async (eventResponse: any) => {
      // Load the event's publishing profile when event data is loaded
      if (!eventResponse?.eventId) return
      
      try {
        const profileResponse = await cachedApi.getEventPublishingProfile(eventResponse.eventId, { skipStaleGroupRecovery: true })
        
        // Response could be an array or single object
        const profiles = Array.isArray(profileResponse) ? profileResponse : [profileResponse]
        const profileAssociation = profiles[0]
        
        if (profileAssociation && !('error' in profileAssociation)) {
          applyPublishingProfileFromServer(
            publishingProfileFromAssociation(profileAssociation as { profile?: PublishingProfile; profileId?: string })
          )
        }
      } catch (err) {
        console.error('Failed to load publishing profile:', err)
        // Non-fatal - profile may not exist yet
      }
    },
    onAfterSave: async (eventId: string) => {
      // Save/update the publishing profile after the event is saved
      const savedMetadata = formDataRef.current?.metadata ?? {}
      const hasMetadataKeys = Object.keys(savedMetadata).length > 0
      const existingProfile = publishingProfileRef.current

      if (!existingProfile?.profileId && !hasMetadataKeys) {
        return // No profile yet and nothing to create
      }

      try {
        if (existingProfile?.profileId) {
          // Update existing profile (including clearing metadata to {})
          const updateResult = await apiService.updatePublishingProfile(existingProfile.profileId, {
            name: existingProfile.name,
            description: existingProfile.description,
            metadata: savedMetadata,
            modificationTime: existingProfile.modificationTime,
          })
          if (
            updateResult &&
            typeof updateResult === 'object' &&
            !('error' in updateResult) &&
            (updateResult as PublishingProfile).profileId
          ) {
            publishingProfileRef.current = {
              ...existingProfile,
              ...(updateResult as PublishingProfile),
            }
            syncAcknowledgmentsAfterProfileSave()
          }
        } else if (hasMetadataKeys) {
          // Create new profile and assign to event
          const createResult = await apiService.createPublishingProfile({
            name: `Event ${eventId} Profile`,
            metadata: savedMetadata,
          })
          
          if (createResult && !('error' in createResult) && createResult.profileId) {
            // Assign the new profile to the event
            await apiService.assignPublishingProfileToEvent(eventId, createResult.profileId)
            publishingProfileRef.current = createResult as PublishingProfile
            syncAcknowledgmentsAfterProfileSave()
          }
        }
      } catch (err) {
        console.error('Failed to save publishing profile:', err)
        // Don't throw - we don't want to fail the entire save
      }
    },
    validate: () => {
      const cat = catalogueRef.current
      const fieldsList = cat?.data?.data
      if (!fieldsList?.length) return true

      const ack = formDataRef.current?.metadataFieldAcknowledged || {}
      const meta = formDataRef.current?.metadata || {}

      for (const field of fieldsList as MetadataField[]) {
        if (ack[field.key]) continue
        if (meta[field.key]) continue
        return `Select a value for ${field.name} (page metadata).`
      }
      return true
    },
  })
  
  // Update refs when values change
  useEffect(() => {
    updateFormDataRef.current = updateFormData
  }, [updateFormData])
  
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    catalogueRef.current = catalogue
  }, [catalogue])
  
  const metadata = formData.metadata || {}
  const metadataFieldAcknowledged = formData.metadataFieldAcknowledged || {}

  // Catalogue arrived after profile metadata was merged — backfill acknowledgments once
  useEffect(() => {
    if (!pendingProfileAckBackfill) return
    if (!publishingProfileRef.current) return
    const keys = catalogueFieldKeys(catalogue)
    if (!keys.length) return

    const prevAck = (formDataRef.current?.metadataFieldAcknowledged || {}) as Record<string, boolean>
    updateFormDataRef.current?.({
      metadataFieldAcknowledged: mergeAckForCatalogueKeys(prevAck, keys),
    })
    setPendingProfileAckBackfill(false)
  }, [catalogue, pendingProfileAckBackfill, mergeAckForCatalogueKeys])
  
  // ============================================================================
  // LOAD PUBLISHING PROFILE ON EDIT MODE
  // ============================================================================
  
  const loadPublishingProfile = useCallback(async (targetEventId: string) => {
    if (!targetEventId) return
    
    try {
      const profileResponse = await cachedApi.getEventPublishingProfile(targetEventId, { skipStaleGroupRecovery: true })
      
      // Response could be an array or single object
      const profiles = Array.isArray(profileResponse) ? profileResponse : [profileResponse]
      const profileAssociation = profiles[0]
      
      if (profileAssociation && !('error' in profileAssociation)) {
        applyPublishingProfileFromServer(
          publishingProfileFromAssociation(profileAssociation as { profile?: PublishingProfile; profileId?: string })
        )
      }
    } catch (err) {
      console.error('Failed to load publishing profile:', err)
      // Non-fatal - profile may not exist yet
    }
  }, [applyPublishingProfileFromServer])
  
  useEffect(() => {
    publishingProfileRef.current = null
    setPendingProfileAckBackfill(false)
  }, [eventId])

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
    const prev = formDataRef.current
    const meta = { ...(prev?.metadata || {}) }
    const noKey = noOptionKey(fieldKey)
    const prevAck = prev?.metadataFieldAcknowledged || {}

    if (value && value !== noKey) {
      meta[fieldKey] = value
    } else {
      delete meta[fieldKey]
    }

    updateFormData({
      metadata: meta,
      metadataFieldAcknowledged: {
        ...prevAck,
        [fieldKey]: true,
      },
    })
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
        <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
          Please note, if a page does NOT have a primary product please use the Adobe for Business tag (CXO &amp; C&amp;P products), <strong>All DX</strong> (CXO products), and <strong>All CC</strong> (C&amp;P products).
        </Text>
      </div>

      {fields.map((field: MetadataField) => {
        const fieldOptions: MetadataOption[] = catalogue?.[field.key]?.data || []
        const currentValue = metadata[field.key] || ''
        const noKey = noOptionKey(field.key)

        const allOptions = [
          ...fieldOptions.map(opt => ({ key: opt.value, label: opt.value })),
          { key: noKey, label: `No ${field.name}` },
        ]

        const selectedKey =
          currentValue
            ? currentValue
            : metadataFieldAcknowledged[field.key]
              ? noKey
              : undefined

        return (
          <Picker
            key={field.key}
            data-testid={`meta-${field.key}-input`}
            label={`${field.name} *`}
            placeholder={`Select ${field.name.toLowerCase()}`}
            selectedKey={selectedKey}
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
