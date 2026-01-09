/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Flex,
  TextField,
  Button,
  Heading,
  Text,
  ActionButton,
  ProgressCircle,
  Picker,
  Item
} from '@adobe/react-spectrum'
import { SponsorData, SeriesSponsor, EventApiResponse, SponsorType } from '../../types/domain'
import { ImageUploader, AutocompleteTextField } from '../../components/shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy'
import Remove from '@spectrum-icons/workflow/Remove'
import DragHandle from '@spectrum-icons/workflow/DragHandle'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import Info from '@spectrum-icons/workflow/Info'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { apiService } from '../../services/api'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'

// Sponsor type options per OpenAPI SponsorType enum
const SPONSOR_TYPE_OPTIONS: { key: SponsorType; label: string }[] = [
  { key: 'Diamond', label: 'Diamond' },
  { key: 'Platinum', label: 'Platinum' },
  { key: 'Gold', label: 'Gold' },
  { key: 'Silver', label: 'Silver' },
  { key: 'Bronze', label: 'Bronze' },
  { key: 'Engagement', label: 'Engagement' },
  { key: 'Partner', label: 'Partner' },
]

/**
 * SponsorsComponent - Manages sponsor and partner information
 * 
 * Uses EventFormContext for state management.
 * Handles:
 * - Adding/removing sponsors
 * - Autocomplete from series sponsors
 * - Saving sponsors to series
 * - Event-level sponsor association (add, update, remove)
 */
export const SponsorsComponent: React.FC = () => {
  // ============================================================================
  // REF FOR LATEST SPONSORS (prevents stale closure in onAfterSave)
  // ============================================================================
  const sponsorsRef = useRef<SponsorData[]>([])

  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
    seriesId,
  } = useEventFormComponent({
    componentId: 'sponsors',
    
    /**
     * After event save, manage sponsors at event level (add, update, remove)
     * Based on v1 reference pattern for speakers
     * 
     * NOTE: Uses sponsorsRef to get the CURRENT sponsors, avoiding stale closure
     */
    onAfterSave: async (savedEventId: string, _eventResponse: EventApiResponse) => {
      // Use ref to get the LATEST sponsors value (not stale from closure)
      const sponsors = sponsorsRef.current
      
      // IMPORTANT: The eventResponse from save API doesn't include sponsors!
      // We must fetch the current event sponsors from the API
      let savedSponsors: any[] = []
      try {
        const sponsorsResponse = await apiService.getEventSponsors(savedEventId)
        if (sponsorsResponse && !('error' in sponsorsResponse)) {
          savedSponsors = sponsorsResponse.sponsors || sponsorsResponse || []
          if (!Array.isArray(savedSponsors)) {
            savedSponsors = []
          }
        }
      } catch (err) {
        console.error('Failed to fetch event sponsors:', err)
      }
      
      // Build current sponsors list from form data
      // API requires: sponsorId, sponsorType (PascalCase enum)
      const currentSponsors = sponsors
        .filter(s => s.sponsorId && (s.isSaved || s.isFromSeries))
        .map(s => ({
          sponsorId: s.sponsorId!,
          sponsorType: s.type || 'Partner' as SponsorType
        }))
      
      // Case 1: All sponsors removed
      if (currentSponsors.length === 0 && savedSponsors.length > 0) {
        await Promise.all(
          savedSponsors.map(async (sponsor: any) => {
            const result = await apiService.removeSponsorFromEvent(sponsor.sponsorId, savedEventId)
            if ('error' in result) {
              console.error(`Failed to remove sponsor ${sponsor.sponsorId} from event:`, result)
            }
          })
        )
        return
      }
      
      // Case 2: Process each current sponsor - add or update
      await Promise.all(
        currentSponsors.map(async (eventSponsor) => {
          if (!eventSponsor.sponsorId) return
          
          if (savedSponsors.length === 0) {
            // No saved sponsors, add all
            const result = await apiService.addSponsorToEvent(eventSponsor, savedEventId)
            if ('error' in result) {
              console.error(`Failed to add sponsor ${eventSponsor.sponsorId} to event:`, result)
            }
          } else {
            // Check if sponsor exists with same type
            const existingSponsor = savedSponsors.find((saved: any) => {
              const idMatch = saved.sponsorId === eventSponsor.sponsorId
              const typeMatch = saved.sponsorType === eventSponsor.sponsorType
              return idMatch && typeMatch
            })
            
            if (existingSponsor) {
              // Sponsor unchanged, do nothing
            } else {
              // Check if sponsor exists but needs update
              const sponsorToUpdate = savedSponsors.find((saved: any) => 
                saved.sponsorId === eventSponsor.sponsorId
              )
              
              if (sponsorToUpdate) {
                // Update sponsor type
                const result = await apiService.updateSponsorInEvent(
                  eventSponsor,
                  eventSponsor.sponsorId,
                  savedEventId
                )
                if ('error' in result) {
                  console.error(`Failed to update sponsor ${eventSponsor.sponsorId} in event:`, result)
                }
              } else {
                // New sponsor, add to event
                const result = await apiService.addSponsorToEvent(eventSponsor, savedEventId)
                if ('error' in result) {
                  console.error(`Failed to add sponsor ${eventSponsor.sponsorId} to event:`, result)
                }
              }
            }
          }
        })
      )
      
      // Case 3: Remove sponsors that are no longer in the form
      if (savedSponsors.length > 0) {
        await Promise.all(
          savedSponsors.map(async (savedSponsor: any) => {
            const stillNeeded = currentSponsors.find(s => s.sponsorId === savedSponsor.sponsorId)
            if (!stillNeeded) {
              const result = await apiService.removeSponsorFromEvent(savedSponsor.sponsorId, savedEventId)
              if ('error' in result) {
                console.error(`Failed to remove sponsor ${savedSponsor.sponsorId} from event:`, result)
              }
            }
          })
        )
      }
    }
  })
  
  const sponsors = formData.sponsors || []

  // Keep sponsorsRef in sync with the latest sponsors
  useEffect(() => {
    sponsorsRef.current = sponsors
  }, [sponsors])
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [availableSponsors, setAvailableSponsors] = useState<SeriesSponsor[]>([])
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  // Store pending image files per sponsor index (for deferred upload)
  const [pendingFiles, setPendingFiles] = useState<Map<number, File>>(new Map())
  // Editing state per sponsor
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set())
  // Expanded cards in read-only view (for toggle between collapsed/expanded)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const fetchSeriesSponsors = async () => {
      if (!seriesId) return
      
      setIsLoadingSponsors(true)
      try {
        const response = await apiService.getSponsors(seriesId)
        if (isMounted && response && !('error' in response)) {
          const sponsorsList = response.sponsors || response || []
          setAvailableSponsors(sponsorsList)
        }
      } catch (error) {
        console.error('Failed to fetch series sponsors:', error)
      } finally {
        if (isMounted) {
          setIsLoadingSponsors(false)
        }
      }
    }

    fetchSeriesSponsors()
    
    return () => {
      isMounted = false
    }
  }, [seriesId])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const addSponsor = useCallback(() => {
    const newSponsor: SponsorData = {
      id: `sponsor-${Date.now()}`,
      partnerName: '',
      partnerUrl: '',
      isSaved: false
    }
    updateFormData({ sponsors: [...sponsors, newSponsor] })
  }, [sponsors, updateFormData])

  const removeSponsor = useCallback((index: number) => {
    updateFormData({ sponsors: sponsors.filter((_, i) => i !== index) })
  }, [sponsors, updateFormData])

  const updateSponsor = useCallback((index: number, updates: Partial<SponsorData>) => {
    const updated = [...sponsors]
    updated[index] = { ...updated[index], ...updates }
    updateFormData({ sponsors: updated })
  }, [sponsors, updateFormData])

  const handleSelectSponsor = (index: number, sponsorId: string) => {
    const selectedSponsor = availableSponsors.find(s => s.sponsorId === sponsorId)
    if (selectedSponsor) {
      // API returns image data under 'image' property (not 'logo')
      const imageData = selectedSponsor.image || selectedSponsor.logo
      updateSponsor(index, {
        sponsorId: selectedSponsor.sponsorId,
        partnerName: selectedSponsor.name,
        partnerUrl: selectedSponsor.externalUrl || selectedSponsor.link || '',
        imageUrl: imageData?.imageUrl,
        imageId: imageData?.imageId,
        isSaved: true,
        isFromSeries: true,
        modificationTime: selectedSponsor.modificationTime
      })
      
      // Exit editing mode
      setEditingIndices(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

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
    updateSponsor(index, { imageUrl: undefined, imageId: undefined })
  }, [updateSponsor])

  /**
   * Upload sponsor image to the series sponsor endpoint
   * POST /v1/series/{seriesId}/sponsors/{sponsorId}/images
   */
  const uploadSponsorImage = async (
    file: File,
    sponsorId: string,
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
      const uploadUrl = `${host}/v1/series/${seriesId}/sponsors/${sponsorId}/images`

      const tracker: UploadTracker = { progress: 0 }
      const config = {
        targetUrl: uploadUrl,
        altText: altText,
        type: 'sponsor-logo'
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
      console.error('Failed to upload sponsor image:', err)
      return null
    }
  }

  const handleSaveSponsor = async (index: number) => {
    const sponsor = sponsors[index]
    if (!seriesId || !sponsor.partnerName) return

    setSavingIndex(index)
    try {
      // Per OpenAPI BaseSponsorProperties: requires name and link
      // link must be a valid URL pattern: ^https:\/\/...
      // Validate link is provided (required field)
      if (!sponsor.partnerUrl || !sponsor.partnerUrl.startsWith('https://')) {
        console.error('Sponsor link must be a valid https:// URL')
        setSavingIndex(null)
        return
      }
      
      const sponsorData = {
        name: sponsor.partnerName,
        link: sponsor.partnerUrl // Required field per OpenAPI
      }

      let response
      if (sponsor.sponsorId && (sponsor.isSaved || sponsor.isFromSeries)) {
        response = await apiService.updateSponsor(
          { ...sponsorData, modificationTime: sponsor.modificationTime },
          sponsor.sponsorId,
          seriesId,
          'en-US'
        )
      } else {
        response = await apiService.createSponsor(sponsorData, seriesId, 'en-US')
      }

      if (response && !('error' in response)) {
        const savedSponsor = response.sponsor || response
        const sponsorId = savedSponsor.sponsorId || sponsor.sponsorId
        
        // Upload pending image if there is one
        const pendingFile = pendingFiles.get(index)
        let uploadedImage: { imageUrl: string; imageId: string } | null = null
        
        if (pendingFile) {
          const altText = sponsor.partnerName || 'Sponsor logo'
          uploadedImage = await uploadSponsorImage(
            pendingFile, 
            sponsorId, 
            altText,
            sponsor.imageId // Pass existing imageId for updates
          )
          
          // Clear the pending file
          setPendingFiles(prev => {
            const next = new Map(prev)
            next.delete(index)
            return next
          })
        }
        
        updateSponsor(index, {
          sponsorId: sponsorId,
          isSaved: true,
          isFromSeries: true,
          modificationTime: savedSponsor.modificationTime,
          // Update image if we just uploaded one
          ...(uploadedImage ? {
            imageUrl: uploadedImage.imageUrl,
            imageId: uploadedImage.imageId
          } : {})
        })

        // Exit editing mode
        setEditingIndices(prev => {
          const next = new Set(prev)
          next.delete(index)
          return next
        })

        // Refresh the available sponsors list
        const updatedResponse = await apiService.getSponsors(seriesId)
        if (updatedResponse && !('error' in updatedResponse)) {
          setAvailableSponsors(updatedResponse.sponsors || updatedResponse || [])
        }
      } else {
        console.error('Failed to save sponsor:', response)
      }
    } catch (error) {
      console.error('Failed to save sponsor:', error)
    } finally {
      setSavingIndex(null)
    }
  }

  const handleEditSponsor = (index: number) => {
    setEditingIndices(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    // Expand the card when entering edit mode
    setExpandedCards(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  const handleToggleExpand = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleCancelEdit = (index: number) => {
    const sponsor = sponsors[index]
    if (sponsor.isSaved || sponsor.isFromSeries) {
      // For saved sponsors, just exit edit mode
      setEditingIndices(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    } else {
      // For new unsaved sponsors, remove them
      removeSponsor(index)
    }
  }

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
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

    // Reorder the sponsors array
    const newSponsors = [...sponsors]
    const [draggedItem] = newSponsors.splice(draggedIndex, 1)
    newSponsors.splice(dropIndex, 0, draggedItem)
    
    updateFormData({ sponsors: newSponsors })
    
    // Update indices to follow the items
    const updateIndices = (prev: Set<number>) => {
      const newSet = new Set<number>()
      prev.forEach(oldIndex => {
        if (oldIndex === draggedIndex) {
          newSet.add(dropIndex)
        } else if (draggedIndex < dropIndex) {
          if (oldIndex > draggedIndex && oldIndex <= dropIndex) {
            newSet.add(oldIndex - 1)
          } else {
            newSet.add(oldIndex)
          }
        } else {
          if (oldIndex >= dropIndex && oldIndex < draggedIndex) {
            newSet.add(oldIndex + 1)
          } else {
            newSet.add(oldIndex)
          }
        }
      })
      return newSet
    }
    
    setExpandedCards(updateIndices)
    setEditingIndices(updateIndices)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  const isReadOnly = (sponsor: SponsorData, index: number): boolean => {
    if (editingIndices.has(index)) return false
    return !!(sponsor.isSaved || sponsor.isFromSeries)
  }

  const isSponsorComplete = (sponsor: SponsorData): boolean => {
    return !!(sponsor.partnerName && sponsor.partnerUrl)
  }

  /**
   * Format modification time for display
   */
  const formatLastUpdate = (modificationTime?: number | string): string => {
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-200">
      <Flex alignItems="center" gap="size-150">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Sponsors & Partners</Heading>
        {isLoadingSponsors && (
          <ProgressCircle size="S" isIndeterminate aria-label="Loading sponsors" />
        )}
      </Flex>

      <Text>Add sponsor and partner information. Drag to reorder.</Text>

      {/* Empty State */}
      {sponsors.length === 0 && (
        <View 
          padding="size-400" 
          backgroundColor="gray-100" 
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <Flex direction="column" alignItems="center" gap="size-200">
            <Text>Create a new sponsor or partner to add to your event</Text>
            <Button 
              variant="secondary" 
              onPress={addSponsor}
            >
              <Add />
              <Text>Add sponsor</Text>
            </Button>
          </Flex>
        </View>
      )}

      {sponsors.map((sponsor, index) => {
        const readOnly = isReadOnly(sponsor, index)
        const isSaving = savingIndex === index
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index
        const typeLabel = SPONSOR_TYPE_OPTIONS.find(opt => opt.key === sponsor.type)?.label || 'Partner'
        const isExpanded = expandedCards.has(index)

        // ==================== COLLAPSED VIEW (Read-only only) ====================
        if (readOnly && !isExpanded) {
          return (
            <div 
              key={sponsor.id}
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
                  onPress={() => handleToggleExpand(index)} 
                  isQuiet 
                  aria-label="Expand"
                  UNSAFE_style={{ padding: 0 }}
                >
                  <ChevronRight size="S" />
                </ActionButton>

                {/* Logo thumbnail */}
                {sponsor.imageUrl ? (
                  <img 
                    src={sponsor.imageUrl} 
                    alt={sponsor.partnerName || 'Sponsor'}
                    style={{ 
                      width: '60px', 
                      height: '30px', 
                      objectFit: 'contain',
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  />
                ) : (
                  <View
                    UNSAFE_style={{
                      width: '60px',
                      height: '30px',
                      backgroundColor: 'var(--spectrum-global-color-gray-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'var(--spectrum-global-color-gray-600)'
                    }}
                  >
                    {sponsor.partnerName?.substring(0, 2).toUpperCase() || 'SP'}
                  </View>
                )}

                {/* Name and type */}
                <Flex direction="column" flex={1}>
                  <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {sponsor.partnerName || 'Untitled Sponsor'}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    {typeLabel}
                    {sponsor.isSaved && ' • ✓ Saved'}
                  </Text>
                </Flex>

                {/* Action buttons */}
                <Flex gap="size-100" alignItems="center">
                  <ActionButton onPress={() => handleEditSponsor(index)} isQuiet aria-label="Edit">
                    <Edit size="S" />
                  </ActionButton>
                  <ActionButton onPress={() => removeSponsor(index)} isQuiet aria-label="Delete">
                    <Delete size="S" />
                  </ActionButton>
                  {/* Drag Handle */}
                  <View
                    UNSAFE_style={{
                      cursor: 'grab',
                      padding: '4px',
                      color: 'var(--spectrum-global-color-gray-500)'
                    }}
                  >
                    <DragHandle size="S" />
                  </View>
                </Flex>
              </Flex>
            </div>
          )
        }

        // ==================== EXPANDED READ-ONLY VIEW ====================
        if (readOnly) {
          return (
            <div 
              key={sponsor.id} 
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
              {/* Header: Collapse toggle, Sponsor title, delete button */}
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-300">
                <Flex alignItems="center" gap="size-100">
                  <ActionButton 
                    onPress={() => handleToggleExpand(index)} 
                    isQuiet 
                    aria-label="Collapse"
                    UNSAFE_style={{ padding: 0 }}
                  >
                    <ChevronDown size="S" />
                  </ActionButton>
                  <Heading level={4} UNSAFE_style={{ margin: 0 }}>Sponsor</Heading>
                  <Info size="S" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-500)' }} />
                </Flex>
                <ActionButton onPress={() => removeSponsor(index)} isQuiet aria-label="Delete sponsor">
                  <Delete />
                </ActionButton>
              </Flex>

              {/* Type Picker (disabled in read-only) */}
              <Picker
                label="Sponsor Level"
                selectedKey={sponsor.type || 'Partner'}
                onSelectionChange={() => {}}
                width="size-3000"
                isDisabled
                UNSAFE_style={{ marginBottom: '24px' }}
              >
                {SPONSOR_TYPE_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>

              {/* Name as heading */}
              <Heading level={4} UNSAFE_style={{ marginBottom: '16px', marginTop: '8px' }}>
                {sponsor.partnerName || 'Untitled Sponsor'}
              </Heading>

              {/* Sponsor Logo - larger in read-only view */}
              {sponsor.imageUrl && (
                <View marginBottom="size-300" UNSAFE_style={{ maxWidth: '200px' }}>
                  <img 
                    src={sponsor.imageUrl} 
                    alt={sponsor.partnerName || 'Sponsor logo'}
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      borderRadius: '8px',
                      border: '1px solid var(--spectrum-global-color-gray-300)'
                    }}
                  />
                </View>
              )}

              {/* External URL as link */}
              {sponsor.partnerUrl && (
                <View marginBottom="size-300">
                  <Flex gap="size-100" alignItems="center">
                    <LinkOut size="S" UNSAFE_style={{ color: 'var(--spectrum-global-color-blue-600)' }} />
                    <a 
                      href={sponsor.partnerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: 'var(--spectrum-global-color-blue-600)',
                        fontSize: '14px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {sponsor.partnerUrl}
                    </a>
                  </Flex>
                </View>
              )}

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
                    {sponsor.modificationTime 
                      ? `Last update: ${formatLastUpdate(sponsor.modificationTime)}`
                      : ''}
                  </Text>
                  <Button 
                    variant="primary" 
                    onPress={() => handleEditSponsor(index)}
                  >
                    <Edit size="S" />
                    <Text>Edit</Text>
                  </Button>
                </Flex>
              </View>
            </div>
          )
        }

        // ==================== EDIT VIEW ====================
        return (
          <View key={sponsor.id} padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
              <Heading level={4}>
                {sponsor.partnerName || `Sponsor ${index + 1}`}
                {sponsor.isSaved && (
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-green-600)', marginLeft: '8px' }}>
                    ✓ Saved
                  </Text>
                )}
              </Heading>
              <ActionButton onPress={() => removeSponsor(index)} isQuiet aria-label="Remove">
                <Delete />
              </ActionButton>
            </Flex>

            <Flex direction="column" gap="size-150">
              {/* Sponsor Type */}
              <Picker
                label="Sponsor Level"
                selectedKey={sponsor.type || 'Partner'}
                onSelectionChange={(key) => updateSponsor(index, { type: key as SponsorType })}
                width="size-3000"
                isRequired
              >
                {SPONSOR_TYPE_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>

              {/* Name Field */}
              {seriesId ? (
                <AutocompleteTextField
                  label="Partner Name"
                  value={sponsor.partnerName}
                  onChange={(value) => updateSponsor(index, { partnerName: value })}
                  onSelect={(option) => handleSelectSponsor(index, option.id)}
                  options={availableSponsors.map(s => {
                    // API returns image data under 'image' property (not 'logo')
                    const imageData = s.image || s.logo
                    return {
                      id: s.sponsorId,
                      label: s.name,
                      imageUrl: imageData?.imageUrl,
                      initials: s.name?.substring(0, 2).toUpperCase()
                    }
                  })}
                  placeholder="Type to search existing sponsors..."
                  isRequired
                />
              ) : (
                <TextField
                  label="Partner Name"
                  isRequired
                  value={sponsor.partnerName}
                  onChange={(value) => updateSponsor(index, { partnerName: value })}
                  width="100%"
                />
              )}

              {/* Partner Image */}
              <View width="100%" UNSAFE_style={{ maxWidth: '200px' }}>
                <ImageUploader
                  label="Partner Logo"
                  imageUrl={sponsor.imageUrl}
                  imageId={sponsor.imageId}
                  imageKind="sponsor-logo"
                  altText={sponsor.partnerName || 'Sponsor logo'}
                  maxSizeMB={25}
                  width={200}
                  dropzoneTitle="Partner image"
                  dropzoneDimensions="File dimensions 120px wide."
                  deferUpload={true}
                  pendingFile={pendingFiles.get(index)}
                  onFileSelected={(file) => handlePendingFileSelect(index, file)}
                  onChange={(imageUrl, imageId) => {
                    updateSponsor(index, { imageUrl, imageId })
                  }}
                  onRemove={() => handlePendingFileRemove(index)}
                />
              </View>

              {/* Partner URL */}
              <TextField
                label="Partner External URL"
                isRequired
                value={sponsor.partnerUrl}
                onChange={(value) => updateSponsor(index, { partnerUrl: value })}
                width="100%"
                placeholder="https://..."
              />

              {/* Save/Cancel Buttons */}
              {seriesId && (
                <Flex justifyContent="end" gap="size-100" marginTop="size-200">
                  {/* Cancel button */}
                  <Button
                    variant="secondary"
                    onPress={() => handleCancelEdit(index)}
                    isDisabled={isSaving}
                  >
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => handleSaveSponsor(index)}
                    isDisabled={isSaving || !sponsor.partnerName?.trim() || !sponsor.partnerUrl?.trim()}
                  >
                    {isSaving ? (
                      <ProgressCircle aria-label="Saving" size="S" isIndeterminate />
                    ) : (
                      <SaveFloppy />
                    )}
                    <Text>{sponsor.isSaved ? 'Update Sponsor' : 'Save Sponsor'}</Text>
                  </Button>
                </Flex>
              )}
            </Flex>
          </View>
        )
      })}

      {/* Add Sponsor Button - only show when items exist */}
      {sponsors.length > 0 && (
        <Button 
          variant="secondary" 
          onPress={addSponsor}
          width="100%"
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-200)',
            border: 'none',
            color: 'var(--spectrum-global-color-gray-800)'
          }}
        >
          <Add />
          <Text>Add sponsor</Text>
        </Button>
      )}
    </Flex>
  )
}
