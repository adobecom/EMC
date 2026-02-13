/* 
* <license header>
*/

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  View,
  Flex,
  TextField,
  Picker,
  Item,
  Button,
  Heading,
  Text,
  ActionButton,
  ProgressCircle
} from '@adobe/react-spectrum'
import { ProfileData, SeriesSpeaker, SpeakerType, EventApiResponse } from '../../types/domain'
import { RichTextEditor, ImageUploader, AutocompleteTextField } from '../../components/shared'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import Info from '@spectrum-icons/workflow/Info'
import User from '@spectrum-icons/workflow/User'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import DragHandle from '@spectrum-icons/workflow/DragHandle'
import { detectSocialPlatform, isValidUrl, toApiSocialLink, fromApiSocialLink } from '../../utils/socialPlatformDetector'
import { apiService, cachedApi } from '../../services/api'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'

const SPEAKER_TYPE_OPTIONS: { key: SpeakerType; label: string }[] = [
  { key: 'host', label: 'Host' },
  { key: 'presenter', label: 'Presenter' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'guest-speaker', label: 'Guest Speaker' },
  { key: 'keynote', label: 'Keynote' },
  { key: 'judge', label: 'Judge' },
  { key: 'portfolio-reviewer', label: 'Portfolio Reviewer' },
  { key: 'career-advisor', label: 'Career Advisor' },
  { key: 'product-demonstrator', label: 'Product Demonstrator' },
]

/**
 * Format modification time for display
 */
function formatLastUpdate(modificationTime?: number | string): string {
  if (!modificationTime) return ''
  try {
    const date = new Date(modificationTime)
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    })
  } catch {
    return ''
  }
}

/**
 * Convert kebab-case speaker type to PascalCase for API
 * Form uses: host, presenter, speaker, guest-speaker, keynote, judge, portfolio-reviewer, career-advisor, product-demonstrator
 * API expects: Host, Presenter, Speaker, GuestSpeaker, Keynote, Judge, PortfolioReviewer, CareerAdvisor, ProductDemonstrator
 */
function toApiSpeakerType(type: SpeakerType | string): string {
  const typeMap: Record<string, string> = {
    'host': 'Host',
    'presenter': 'Presenter',
    'speaker': 'Speaker',
    'guest-speaker': 'GuestSpeaker',
    'keynote': 'Keynote',
    'judge': 'Judge',
    'portfolio-reviewer': 'PortfolioReviewer',
    'career-advisor': 'CareerAdvisor',
    'product-demonstrator': 'ProductDemonstrator',
    // Also handle if already in PascalCase
    'Host': 'Host',
    'Presenter': 'Presenter',
    'Speaker': 'Speaker',
    'GuestSpeaker': 'GuestSpeaker',
    'Keynote': 'Keynote',
    'Judge': 'Judge',
    'PortfolioReviewer': 'PortfolioReviewer',
    'CareerAdvisor': 'CareerAdvisor',
    'ProductDemonstrator': 'ProductDemonstrator',
  }
  return typeMap[type] || 'Speaker'
}

/**
 * SpeakersComponent - Manages speaker and host profiles
 * 
 * Uses EventFormContext for state management.
 * Handles:
 * - Adding/removing profiles
 * - Autocomplete from series speakers
 * - Saving speakers to series
 * - Social media links
 * 
 * Note: Speaker association with event is handled in the main event payload.
 * The onAfterSave callback associates speakers with the event after save.
 */
export const SpeakersComponent: React.FC = () => {
  // ============================================================================
  // REF FOR LATEST PROFILES (prevents stale closure in onAfterSave)
  // ============================================================================
  const profilesRef = useRef<ProfileData[]>([])
  
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    seriesId,
    locale,
  } = useEventFormComponent({
    componentId: 'speakers',
    
    /**
     * After event save, manage speakers at event level (add, update, remove)
     * Based on v1 reference: profile-component.js
     * 
     * NOTE: Uses profilesRef to get the CURRENT profiles, avoiding stale closure
     */
    onAfterSave: async (savedEventId: string, _eventResponse: EventApiResponse) => {
      // Use ref to get the LATEST profiles value (not stale from closure)
      const profiles = profilesRef.current
      
      // IMPORTANT: The eventResponse from save API doesn't include speakers!
      // We must fetch the current event speakers from the API
      let savedSpeakers: any[] = []
      try {
        const speakersResponse = await cachedApi.getEventSpeakers(savedEventId)
        if (speakersResponse && !('error' in speakersResponse)) {
          savedSpeakers = speakersResponse.speakers || speakersResponse || []
          if (!Array.isArray(savedSpeakers)) {
            savedSpeakers = []
          }
        }
      } catch (err) {
        console.error('Failed to fetch event speakers:', err)
      }
      
      // Build current speakers list from form data
      // API requires: speakerId, speakerType (PascalCase enum), ordinal
      const currentSpeakers = profiles
        .filter(p => p.speakerId && p.isSaved)
        .map((p, index) => ({
          speakerId: p.speakerId!,
          speakerType: toApiSpeakerType(p.type),
          ordinal: index
        }))
      
      // Case 1: All speakers removed
      if (currentSpeakers.length === 0 && savedSpeakers.length > 0) {
        await Promise.all(
          savedSpeakers.map(async (speaker: any) => {
            const result = await apiService.removeSpeakerFromEvent(speaker.speakerId, savedEventId)
            if ('error' in result) {
              console.error(`Failed to remove speaker ${speaker.speakerId} from event:`, result)
            }
          })
        )
        return
      }
      
      // Case 2: Process each current speaker - add or update
      await Promise.all(
        currentSpeakers.map(async (eventSpeaker) => {
          if (!eventSpeaker.speakerId) return
          
          if (savedSpeakers.length === 0) {
            // No saved speakers, add all
            const result = await apiService.addSpeakerToEvent(eventSpeaker, savedEventId)
            if ('error' in result) {
              console.error(`Failed to add speaker ${eventSpeaker.speakerId} to event:`, result)
            }
          } else {
            // Check if speaker exists with same type and ordinal
            const existingSpeaker = savedSpeakers.find((saved: any) => {
              const idMatch = saved.speakerId === eventSpeaker.speakerId
              const typeMatch = saved.speakerType === eventSpeaker.speakerType
              const ordinalMatch = saved.ordinal === eventSpeaker.ordinal
              return idMatch && typeMatch && ordinalMatch
            })
            
            if (existingSpeaker) {
              // Speaker unchanged, do nothing
            } else {
              // Check if speaker exists but needs update
              const speakerToUpdate = savedSpeakers.find((saved: any) => 
                saved.speakerId === eventSpeaker.speakerId
              )
              
              if (speakerToUpdate) {
                // Update speaker type or ordinal
                const result = await apiService.updateSpeakerInEvent(
                  eventSpeaker,
                  eventSpeaker.speakerId,
                  savedEventId
                )
                if ('error' in result) {
                  console.error(`Failed to update speaker ${eventSpeaker.speakerId} in event:`, result)
                }
              } else {
                // New speaker, add to event
                const result = await apiService.addSpeakerToEvent(eventSpeaker, savedEventId)
                if ('error' in result) {
                  console.error(`Failed to add speaker ${eventSpeaker.speakerId} to event:`, result)
                }
              }
            }
          }
        })
      )
      
      // Case 3: Remove speakers that are no longer in the form
      if (savedSpeakers.length > 0) {
        await Promise.all(
          savedSpeakers.map(async (savedSpeaker: any) => {
            const stillNeeded = currentSpeakers.find(p => p.speakerId === savedSpeaker.speakerId)
            if (!stillNeeded) {
              const result = await apiService.removeSpeakerFromEvent(savedSpeaker.speakerId, savedEventId)
              if ('error' in result) {
                console.error(`Failed to remove speaker ${savedSpeaker.speakerId} from event:`, result)
              }
            }
          })
        )
      }
    }
  })
  
  const profiles = formData.profiles || []
  
  // Keep profilesRef in sync with the latest profiles
  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [seriesSpeakers, setSeriesSpeakers] = useState<SeriesSpeaker[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set())
  // Store pending image files per profile index (for deferred upload)
  const [pendingFiles, setPendingFiles] = useState<Map<number, File>>(new Map())
  // Collapsed state per profile (true = collapsed, showing only summary)
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(new Set())
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (!seriesId) return

    let isMounted = true

    const loadSeriesSpeakers = async () => {
      setIsLoadingSpeakers(true)
      try {
        const response = await cachedApi.getSpeakers(seriesId)
        if (isMounted && response && !('error' in response)) {
          const speakers = response.speakers || response || []
          setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
        }
      } catch (err) {
        console.error('Failed to load series speakers:', err)
      } finally {
        if (isMounted) {
          setIsLoadingSpeakers(false)
        }
      }
    }

    loadSeriesSpeakers()

    return () => {
      isMounted = false
    }
  }, [seriesId])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const availableSpeakers = useMemo(() => {
    const selectedIds = new Set(profiles.map(p => p.speakerId).filter(Boolean))
    return seriesSpeakers.filter(s => !selectedIds.has(s.speakerId))
  }, [seriesSpeakers, profiles])

  // ============================================================================
  // HELPERS
  // ============================================================================

  const isReadOnly = (profile: ProfileData, index: number): boolean => {
    if (editingIndices.has(index)) return false
    return !!(profile.isSaved || profile.isFromSeries)
  }

  /**
   * Get filtered autocomplete options based on both first and last name values.
   * This allows both fields to work together to narrow down suggestions.
   */
  const getFilteredAutocompleteOptions = useCallback((profile: ProfileData) => {
    return availableSpeakers
      .filter(speaker => {
        // If firstName has a value, filter by firstName match
        if (profile.firstName && profile.firstName.trim()) {
          const firstNameMatch = speaker.firstName?.toLowerCase().includes(profile.firstName.toLowerCase().trim())
          if (!firstNameMatch) return false
        }
        // If lastName has a value, filter by lastName match
        if (profile.lastName && profile.lastName.trim()) {
          const lastNameMatch = speaker.lastName?.toLowerCase().includes(profile.lastName.toLowerCase().trim())
          if (!lastNameMatch) return false
        }
        return true
      })
      .map(speaker => ({
        id: speaker.speakerId,
        label: `${speaker.firstName} ${speaker.lastName}`,
        imageUrl: speaker.photo?.imageUrl,
        initials: `${speaker.firstName?.[0] || ''}${speaker.lastName?.[0] || ''}`
      }))
  }, [availableSpeakers])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const addProfile = useCallback(() => {
    const newProfile: ProfileData = {
      type: 'speaker',
      firstName: '',
      lastName: '',
      title: '',
      bio: '',
      socialLinks: []
    }
    updateFormData({ profiles: [...profiles, newProfile] })
  }, [profiles, updateFormData])

  const removeProfile = useCallback((index: number) => {
    updateFormData({ profiles: profiles.filter((_, i) => i !== index) })
  }, [profiles, updateFormData])

  const updateProfile = useCallback((index: number, updates: Partial<ProfileData>) => {
    const updated = [...profiles]
    updated[index] = { ...updated[index], ...updates }
    updateFormData({ profiles: updated })
  }, [profiles, updateFormData])

  const addSocialLink = useCallback((profileIndex: number) => {
    const updated = [...profiles]
    const profile = updated[profileIndex]
    profile.socialLinks = [...(profile.socialLinks || []), { url: '' }]
    updateFormData({ profiles: updated })
  }, [profiles, updateFormData])

  const removeSocialLink = useCallback((profileIndex: number, linkIndex: number) => {
    const updated = [...profiles]
    const profile = updated[profileIndex]
    profile.socialLinks = (profile.socialLinks || []).filter((_, i) => i !== linkIndex)
    updateFormData({ profiles: updated })
  }, [profiles, updateFormData])

  const updateSocialLink = useCallback((profileIndex: number, linkIndex: number, url: string) => {
    const updated = [...profiles]
    const profile = updated[profileIndex]
    const socialLinks = [...(profile.socialLinks || [])]
    const platform = detectSocialPlatform(url)
    socialLinks[linkIndex] = { url, platform: platform?.name }
    profile.socialLinks = socialLinks
    updateFormData({ profiles: updated })
  }, [profiles, updateFormData])

  const handlePendingFileSelect = useCallback((index: number, file: File) => {
    setPendingFiles(prev => {
      const next = new Map(prev)
      next.set(index, file)
      return next
    })
  }, [])

  const handlePendingFileRemove = useCallback((index: number) => {
    setPendingFiles(prev => {
      const next = new Map(prev)
      next.delete(index)
      return next
    })
    // Also clear any existing image
    updateProfile(index, { imageUrl: undefined, imageId: undefined })
  }, [updateProfile])

  /**
   * Get localized value from speaker object
   * Checks localizations[locale] first, then falls back to top-level
   */
  const getLocalizedSpeakerValue = (speaker: any, field: string): string => {
    // Check localized value first
    const localizedValue = speaker.localizations?.[locale]?.[field]
    if (localizedValue !== undefined && localizedValue !== null && localizedValue !== '') {
      return localizedValue
    }
    // Fall back to top-level value
    return speaker[field] || ''
  }

  const handleSelectSpeaker = (index: number, speakerId: string | null) => {
    if (!speakerId) return

    const speaker = seriesSpeakers.find(s => s.speakerId === speakerId)
    if (!speaker) return

    updateProfile(index, {
      speakerId: speaker.speakerId,
      firstName: speaker.firstName,
      lastName: speaker.lastName,
      title: getLocalizedSpeakerValue(speaker, 'title'),
      bio: getLocalizedSpeakerValue(speaker, 'bio'),
      imageUrl: speaker.photo?.imageUrl,
      imageId: speaker.photo?.imageId,
      // Convert API format (serviceName, link) to form format (url, platform)
      socialLinks: speaker.socialLinks?.map(link => fromApiSocialLink(link)) || [],
      isFromSeries: true,
      isSaved: true,
      modificationTime: speaker.modificationTime
    })

    setEditingIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  /**
   * Upload speaker image to the series speaker endpoint
   * POST /v1/series/{seriesId}/speakers/{speakerId}/images
   */
  const uploadSpeakerImage = async (
    file: File,
    speakerId: string,
    altText: string,
    existingImageId?: string
  ): Promise<{ imageUrl: string; imageId: string } | null> => {
    try {
      const token = tokenStorage.getValidToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const env = getCurrentEnvironment()
      const host = getApiHost('esp', env)
      const uploadUrl = `${host}/v1/series/${seriesId}/speakers/${speakerId}/images`

      const tracker: UploadTracker = { progress: 0 }
      const config = {
        targetUrl: uploadUrl,
        altText: altText,
        type: 'speaker-photo'
      }

      const result = await uploadImage(file, config, token, tracker, existingImageId)
      
      // Handle different response formats - the API might wrap the image object
      const imageData = result.image || result
      
      if (imageData.imageUrl && imageData.imageId) {
        return { imageUrl: imageData.imageUrl, imageId: imageData.imageId }
      }
      
      console.warn('Unexpected image upload response format:', result)
      return null
    } catch (err) {
      console.error('Failed to upload speaker image:', err)
      return null
    }
  }

  const handleSaveSpeaker = async (index: number) => {
    const profile = profiles[index]
    if (!seriesId || !profile.firstName || !profile.lastName) return

    setSavingIndex(index)

    try {
      // Build speaker payload with proper localization structure
      // Per OpenAPI schema:
      // - firstName, lastName, socialLinks are top-level (non-localizable)
      // - title, bio go in localizations[locale] for specific locale support
      const speakerData: Record<string, any> = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        // Convert form format (url, platform) to API format (serviceName, link)
        socialLinks: profile.socialLinks?.filter(l => l.url).map(l => toApiSocialLink(l)) || []
      }
      
      // Add localizable fields to the localizations container
      const localizableFields: Record<string, any> = {}
      if (profile.title) {
        localizableFields.title = profile.title
      }
      if (profile.bio) {
        localizableFields.bio = profile.bio
      }
      
      if (Object.keys(localizableFields).length > 0) {
        speakerData.localizations = {
          [locale]: localizableFields
        }
      }

      let response
      if (profile.speakerId && profile.isSaved) {
        response = await apiService.updateSpeaker(
          { ...speakerData, speakerId: profile.speakerId, modificationTime: profile.modificationTime },
          seriesId
        )
      } else {
        response = await apiService.createSpeaker(speakerData, seriesId)
      }

      if (response && !('error' in response)) {
        const savedSpeaker = response.speaker || response
        const speakerId = savedSpeaker.speakerId
        
        // Upload pending image if there is one
        const pendingFile = pendingFiles.get(index)
        let uploadedImage: { imageUrl: string; imageId: string } | null = null
        
        if (pendingFile) {
          const altText = `${profile.firstName} ${profile.lastName}`
          uploadedImage = await uploadSpeakerImage(
            pendingFile, 
            speakerId, 
            altText,
            profile.imageId // Pass existing imageId for updates
          )
          
          // Clear the pending file
          setPendingFiles(prev => {
            const next = new Map(prev)
            next.delete(index)
            return next
          })
        }
        
        updateProfile(index, {
          speakerId: speakerId,
          isSaved: true,
          isFromSeries: false,
          modificationTime: savedSpeaker.modificationTime,
          // Update image if we just uploaded one
          ...(uploadedImage ? {
            imageUrl: uploadedImage.imageUrl,
            imageId: uploadedImage.imageId
          } : {})
        })

        setEditingIndices(prev => {
          const next = new Set(prev)
          next.delete(index)
          return next
        })

        // Refresh series speakers list
        const refreshed = await cachedApi.getSpeakers(seriesId)
        if (refreshed && !('error' in refreshed)) {
          const speakers = refreshed.speakers || refreshed || []
          setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
        }
      } else {
        console.error('Failed to save speaker:', response)
      }
    } catch (err) {
      console.error('Error saving speaker:', err)
    } finally {
      setSavingIndex(null)
    }
  }

  const handleToggleEdit = (index: number) => {
    setEditingIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleToggleCollapse = (index: number) => {
    setCollapsedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder the profiles array
    const newProfiles = [...profiles]
    const [draggedItem] = newProfiles.splice(draggedIndex, 1)
    newProfiles.splice(dropIndex, 0, draggedItem)
    
    updateFormData({ profiles: newProfiles })
    
    // Update collapsed indices to follow the items
    setCollapsedIndices(prev => {
      const newCollapsed = new Set<number>()
      prev.forEach(oldIndex => {
        if (oldIndex === draggedIndex) {
          newCollapsed.add(dropIndex)
        } else if (draggedIndex < dropIndex) {
          // Item moved down
          if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
            newCollapsed.add(oldIndex - 1)
          } else {
            newCollapsed.add(oldIndex)
          }
        } else {
          // Item moved up
          if (oldIndex >= dropIndex && oldIndex < draggedIndex) {
            newCollapsed.add(oldIndex + 1)
          } else {
            newCollapsed.add(oldIndex)
          }
        }
      })
      return newCollapsed
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      <Flex alignItems="center" gap="size-150">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Speakers & Hosts</Heading>
        {isLoadingSpeakers && (
          <ProgressCircle size="S" isIndeterminate aria-label="Loading speakers" />
        )}
      </Flex>

      <Text>Add speaker and event host details. Drag to reorder. Profiles will appear in the order shown.</Text>

      {/* Empty State */}
      {profiles.length === 0 && (
        <View 
          padding="size-400" 
          backgroundColor="gray-100" 
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <Flex direction="column" alignItems="center" gap="size-200">
            <Text>Create a new profile to add speakers or hosts to your event</Text>
            <Button 
              variant="secondary" 
              onPress={addProfile}
            >
              <Add />
              <Text>Add profile</Text>
            </Button>
          </Flex>
        </View>
      )}

      {profiles.map((profile, index) => {
        const readOnly = isReadOnly(profile, index)
        const isSaving = savingIndex === index
        const isCollapsed = collapsedIndices.has(index) && readOnly
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index

        // Get display name for collapsed/summary view
        const displayName = profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}`
          : `Profile ${index + 1}`
        const typeLabel = SPEAKER_TYPE_OPTIONS.find(opt => opt.key === profile.type)?.label || 'Speaker'

        // ==================== COLLAPSED VIEW (Read-only only) ====================
        if (isCollapsed) {
          return (
            <div 
              key={index}
              draggable
              onDragStart={(e: React.DragEvent) => handleDragStart(e, index)}
              onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e: React.DragEvent) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                padding: '12px 16px',
                border: isDragOver 
                  ? '2px solid var(--spectrum-global-color-blue-500)' 
                  : '1px solid var(--spectrum-global-color-gray-300)',
                borderRadius: '8px',
                backgroundColor: isDragging 
                  ? 'var(--spectrum-global-color-gray-100)' 
                  : 'var(--spectrum-global-color-gray-50)',
                opacity: isDragging ? 0.5 : 1,
                cursor: 'default',
                transition: 'border-color 0.2s, background-color 0.2s'
              }}
            >
              <Flex alignItems="center" gap="size-150">
                {/* Expand/Collapse Toggle */}
                <ActionButton 
                  onPress={() => handleToggleCollapse(index)} 
                  isQuiet 
                  aria-label="Expand"
                  UNSAFE_style={{ padding: 0 }}
                >
                  <ChevronRight size="S" />
                </ActionButton>

                {/* Profile thumbnail */}
                {profile.imageUrl ? (
                  <img 
                    src={profile.imageUrl} 
                    alt={displayName}
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--spectrum-global-color-gray-300)'
                    }}
                  />
                ) : (
                  <View
                    UNSAFE_style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--spectrum-global-color-gray-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--spectrum-global-color-gray-600)',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {profile.firstName?.[0] || ''}{profile.lastName?.[0] || ''}
                  </View>
                )}

                {/* Name and type */}
                <Flex direction="column" flex={1}>
                  <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {displayName}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    {typeLabel}
                    {profile.isSaved && ' • ✓ Saved'}
                  </Text>
                </Flex>

                {/* Action buttons */}
                <Flex gap="size-100" alignItems="center">
                  <ActionButton onPress={() => handleToggleEdit(index)} isQuiet aria-label="Edit">
                    <User size="S" />
                  </ActionButton>
                  <ActionButton onPress={() => removeProfile(index)} isQuiet aria-label="Delete">
                    <Delete size="S" />
                  </ActionButton>
                  <DragHandle />
                </Flex>
              </Flex>
            </div>
          )
        }

        // ==================== EXPANDED READ-ONLY VIEW ====================
        if (readOnly) {
          return (
            <div 
              key={index} 
              onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e: React.DragEvent) => handleDrop(e, index)}
              style={{
                padding: '20px',
                border: isDragOver 
                  ? '2px solid var(--spectrum-global-color-blue-500)' 
                  : '1px solid var(--spectrum-global-color-gray-300)',
                borderRadius: '8px',
                transition: 'border-color 0.2s'
              }}
            >
              {/* Header: Collapse toggle, Profile title, drag handle, delete button */}
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
                <Flex alignItems="center" gap="size-100">
                  <ActionButton 
                    onPress={() => handleToggleCollapse(index)} 
                    isQuiet 
                    aria-label="Collapse"
                    UNSAFE_style={{ padding: 0 }}
                  >
                    <ChevronDown size="S" />
                  </ActionButton>
                  <Heading level={4} UNSAFE_style={{ margin: 0 }}>Profile</Heading>
                  <Info size="S" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-500)' }} />
                </Flex>
                <ActionButton onPress={() => removeProfile(index)} isQuiet aria-label="Delete profile">
                  <Delete />
                </ActionButton>
              </Flex>

              {/* Type Picker (disabled in read-only) */}
              <Picker
                label="Choose type"
                selectedKey={profile.type}
                onSelectionChange={() => {}}
                width="size-3000"
                isDisabled
                UNSAFE_style={{ marginBottom: '24px' }}
              >
                {SPEAKER_TYPE_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>

              {/* Name as heading */}
              <Heading level={3} UNSAFE_style={{ marginBottom: '16px', marginTop: '8px', fontSize: '22px' }}>
                {displayName}
              </Heading>

              {/* Profile Image - larger in read-only view */}
              {profile.imageUrl && (
                <View marginBottom="size-300" UNSAFE_style={{ maxWidth: '400px' }}>
                  <img 
                    src={profile.imageUrl} 
                    alt={displayName}
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      borderRadius: '8px',
                      border: '1px solid var(--spectrum-global-color-gray-300)'
                    }}
                  />
                </View>
              )}

              {/* Title/Bio as plain text */}
              {(profile.title || profile.bio) && (
                <View marginBottom="size-300">
                  {profile.title && (
                    <Text UNSAFE_style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      {profile.title}
                    </Text>
                  )}
                  {profile.bio && (
                    <View UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                      <div dangerouslySetInnerHTML={{ __html: profile.bio }} />
                    </View>
                  )}
                </View>
              )}

              {/* Social Media Section */}
              <View marginTop="size-200">
                <Heading level={5} UNSAFE_style={{ marginBottom: '24px' }}>Social Media</Heading>
                
                {profile.socialLinks && profile.socialLinks.length > 0 ? (
                  <Flex direction="column" gap="size-100">
                    {profile.socialLinks.map((socialLink, linkIndex) => {
                      const detectedPlatform = detectSocialPlatform(socialLink.url)
                      return (
                        <Flex key={linkIndex} gap="size-100" alignItems="center">
                          <View
                            UNSAFE_style={{
                              minWidth: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: detectedPlatform 
                                ? detectedPlatform.color 
                                : 'var(--spectrum-global-color-gray-400)',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              flexShrink: 0
                            }}
                          >
                            {detectedPlatform ? detectedPlatform.icon : <LinkOut />}
                          </View>
                          <a 
                            href={socialLink.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              color: 'var(--spectrum-global-color-blue-600)',
                              fontSize: '14px',
                              wordBreak: 'break-all'
                            }}
                          >
                            {socialLink.url}
                          </a>
                        </Flex>
                      )
                    })}
                  </Flex>
                ) : null}
              </View>

              {/* Footer: Last update and Edit button */}
              <View 
                UNSAFE_style={{ 
                  borderTop: '1px solid var(--spectrum-global-color-gray-200)',
                  marginTop: '24px',
                  paddingTop: '16px'
                }}
              >
                <Flex justifyContent="space-between" alignItems="center">
                  <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    {profile.modificationTime 
                      ? `Last update: ${formatLastUpdate(profile.modificationTime)}`
                      : ''}
                  </Text>
                  <Button 
                    variant="primary" 
                    onPress={() => handleToggleEdit(index)}
                  >
                    <User size="S" />
                    <Text>Edit</Text>
                  </Button>
                </Flex>
              </View>
            </div>
          )
        }

        // ==================== EDIT VIEW ====================
        return (
          <View key={index} padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
              <Heading level={4}>
                {profile.firstName && profile.lastName 
                  ? `${profile.firstName} ${profile.lastName}`
                  : `Profile ${index + 1}`}
                {profile.isSaved && (
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-green-600)', marginLeft: '8px' }}>
                    ✓ Saved
                  </Text>
                )}
              </Heading>
              <ActionButton onPress={() => removeProfile(index)} isQuiet aria-label="Remove">
                <Delete />
              </ActionButton>
            </Flex>

            <Flex direction="column" gap="size-150">
              {/* Type Picker */}
              <Picker
                label="Choose type"
                selectedKey={profile.type}
                onSelectionChange={(key) => updateProfile(index, { type: key as SpeakerType })}
                width="size-3000"
                isRequired
              >
                {SPEAKER_TYPE_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>

              {/* Name Fields */}
              <Flex direction="row" gap="size-150">
                {seriesId ? (
                  <>
                    <AutocompleteTextField
                      label="First Name"
                      value={profile.firstName}
                      onChange={(value) => updateProfile(index, { firstName: value })}
                      onSelect={(option) => handleSelectSpeaker(index, option.id)}
                      options={getFilteredAutocompleteOptions(profile)}
                      isRequired
                    />
                    <AutocompleteTextField
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(value) => updateProfile(index, { lastName: value })}
                      onSelect={(option) => handleSelectSpeaker(index, option.id)}
                      options={getFilteredAutocompleteOptions(profile)}
                      isRequired
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="First Name"
                      value={profile.firstName}
                      onChange={(value) => updateProfile(index, { firstName: value })}
                      width="50%"
                      isRequired
                    />
                    <TextField
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(value) => updateProfile(index, { lastName: value })}
                      width="50%"
                      isRequired
                    />
                  </>
                )}
              </Flex>

              {/* Profile Image */}
              <View width="100%" UNSAFE_style={{ maxWidth: '300px' }}>
                <ImageUploader
                  label="Profile Image"
                  imageUrl={profile.imageUrl}
                  imageId={profile.imageId}
                  imageKind="speaker-photo"
                  altText={`${profile.firstName} ${profile.lastName}`}
                  maxSizeMB={25}
                  width={300}
                  dropzoneTitle="Add profile image"
                  dropzoneDimensions="Dimensions 584 x 300 px"
                  deferUpload={true}
                  pendingFile={pendingFiles.get(index)}
                  onFileSelected={(file) => handlePendingFileSelect(index, file)}
                  onChange={(imageUrl, imageId) => {
                    updateProfile(index, { imageUrl, imageId })
                  }}
                  onRemove={() => handlePendingFileRemove(index)}
                />
              </View>

              {/* Title */}
              <TextField
                label="Title"
                value={profile.title}
                onChange={(value) => updateProfile(index, { title: value })}
              />

              {/* Bio */}
              <RichTextEditor
                label="Bio (Optional)"
                value={profile.bio || ''}
                onChange={(value) => updateProfile(index, { bio: value })}
                height="200px"
              />

              {/* Social Links - Edit Mode */}
              <View marginTop="size-200">
                <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                  <Text UNSAFE_style={{ fontWeight: 'bold' }}>Social Media Links</Text>
                  <ActionButton onPress={() => addSocialLink(index)} isQuiet>
                    <Add />
                    <Text>Add Link</Text>
                  </ActionButton>
                </Flex>

                {(!profile.socialLinks || profile.socialLinks.length === 0) && (
                  <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                    No social media links added yet.
                  </Text>
                )}

                {profile.socialLinks && profile.socialLinks.map((socialLink, linkIndex) => {
                  const detectedPlatform = detectSocialPlatform(socialLink.url)
                  const isValid = isValidUrl(socialLink.url)
                  
                  return (
                    <Flex key={linkIndex} gap="size-100" alignItems="center" marginTop="size-100">
                      <View
                        UNSAFE_style={{
                          minWidth: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: detectedPlatform 
                            ? detectedPlatform.color 
                            : 'var(--spectrum-global-color-gray-400)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        {detectedPlatform ? detectedPlatform.icon : <LinkOut />}
                      </View>

                      <TextField
                        placeholder="https://..."
                        value={socialLink.url}
                        onChange={(value) => updateSocialLink(index, linkIndex, value)}
                        width="100%"
                        validationState={socialLink.url && !isValid ? 'invalid' : undefined}
                      />

                      <ActionButton onPress={() => removeSocialLink(index, linkIndex)} isQuiet>
                        <Delete />
                      </ActionButton>
                    </Flex>
                  )
                })}
              </View>

              {/* Save/Cancel Buttons */}
              {seriesId && (
                <Flex justifyContent="end" gap="size-100" marginTop="size-200">
                  {/* Cancel button */}
                  <Button
                    variant="secondary"
                    onPress={() => {
                      if (profile.isSaved) {
                        // For saved profiles, just exit edit mode
                        handleToggleEdit(index)
                      } else {
                        // For new unsaved profiles, remove them
                        removeProfile(index)
                      }
                    }}
                    isDisabled={isSaving}
                  >
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => handleSaveSpeaker(index)}
                    isDisabled={isSaving || !profile.firstName?.trim() || !profile.lastName?.trim()}
                  >
                    {isSaving ? (
                      <ProgressCircle aria-label="Saving" size="S" isIndeterminate />
                    ) : (
                      <SaveFloppy />
                    )}
                    <Text>{profile.isSaved ? 'Update Speaker' : 'Save Speaker'}</Text>
                  </Button>
                </Flex>
              )}
            </Flex>
          </View>
        )
      })}

      {/* Add Profile Button - only show when items exist */}
      {profiles.length > 0 && (
        <Button 
          variant="secondary" 
          onPress={addProfile}
          width="100%"
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-200)',
            border: 'none',
            color: 'var(--spectrum-global-color-gray-800)'
          }}
        >
          <Add />
          <Text>Add profile</Text>
        </Button>
      )}
    </Flex>
  )
}
