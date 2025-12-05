/* 
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Flex,
  TextField,
  Button,
  Heading,
  Text,
  ActionButton,
  ProgressCircle
} from '@adobe/react-spectrum'
import { SponsorData, SeriesSponsor, EventApiResponse } from '../../types/domain'
import { ImageUploader, AutocompleteTextField } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy'
import { apiService } from '../../services/api'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * SponsorsComponent - Manages sponsor and partner information
 * 
 * Uses EventFormContext for state management.
 * Handles:
 * - Adding/removing sponsors
 * - Autocomplete from series sponsors
 * - Saving sponsors to series
 * 
 * Note: Sponsor association with event is handled in the main event payload.
 * The onAfterSave callback associates sponsors with the event after save.
 */
export const SponsorsComponent: React.FC = () => {
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
     * After event save, associate sponsors with the event
     */
    onAfterSave: async (savedEventId: string, eventResponse: EventApiResponse) => {
      const sponsors = formData.sponsors || []
      
      // Get sponsors that need to be associated with the event
      const sponsorsToAssociate = sponsors
        .filter(s => s.sponsorId && (s.isSaved || s.isFromSeries))
        .map(s => ({
          sponsorId: s.sponsorId!
        }))
      
      if (sponsorsToAssociate.length === 0) return
      
      try {
        // Associate each sponsor with the event in parallel
        await Promise.all(
          sponsorsToAssociate.map(sponsorData =>
            apiService.addSponsorToEvent(sponsorData, savedEventId).catch(err => {
              console.error(`Failed to associate sponsor ${sponsorData.sponsorId} with event:`, err)
            })
          )
        )
      } catch (error) {
        console.error('Error associating sponsors with event:', error)
      }
    }
  })
  
  const sponsors = formData.sponsors || []
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [availableSponsors, setAvailableSponsors] = useState<SeriesSponsor[]>([])
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

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
      updateSponsor(index, {
        sponsorId: selectedSponsor.sponsorId,
        partnerName: selectedSponsor.name,
        partnerUrl: selectedSponsor.externalUrl || '',
        imageUrl: selectedSponsor.logo?.imageUrl,
        imageId: selectedSponsor.logo?.imageId,
        isSaved: true,
        isFromSeries: true,
        modificationTime: selectedSponsor.modificationTime
      })
    }
  }

  const handleSaveSponsor = async (index: number) => {
    const sponsor = sponsors[index]
    if (!seriesId || !sponsor.partnerName) return

    setSavingIndex(index)
    try {
      const sponsorData = {
        name: sponsor.partnerName,
        externalUrl: sponsor.partnerUrl || ''
      }

      let response
      if (sponsor.sponsorId && sponsor.isFromSeries) {
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
        const newSponsorId = response.sponsorId || sponsor.sponsorId
        updateSponsor(index, {
          sponsorId: newSponsorId,
          isSaved: true,
          isFromSeries: true,
          modificationTime: response.modificationTime
        })

        // Refresh the available sponsors list
        const updatedResponse = await apiService.getSponsors(seriesId)
        if (updatedResponse && !('error' in updatedResponse)) {
          setAvailableSponsors(updatedResponse.sponsors || updatedResponse || [])
        }
      }
    } catch (error) {
      console.error('Failed to save sponsor:', error)
    } finally {
      setSavingIndex(null)
    }
  }

  const handleEditSponsor = (index: number) => {
    updateSponsor(index, { isSaved: false })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-200">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Sponsors & Partners</Heading>
        <Button variant="primary" onPress={addSponsor}>
          <Add />
          <Text>Add Sponsor</Text>
        </Button>
      </Flex>

      <Text>Add sponsor and partner information to display on your event page.</Text>

      {isLoadingSponsors && (
        <Flex alignItems="center" gap="size-100">
          <ProgressCircle size="S" isIndeterminate aria-label="Loading sponsors" />
          <Text>Loading available sponsors...</Text>
        </Flex>
      )}

      {sponsors.length === 0 && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No sponsors added yet. Click "Add Sponsor" to add one.</Text>
        </View>
      )}

      {sponsors.map((sponsor, index) => {
        const readOnly = sponsor.isSaved || sponsor.isFromSeries

        return (
          <View 
            key={sponsor.id} 
            padding="size-200" 
            borderWidth="thin" 
            borderColor="dark" 
            borderRadius="medium"
            UNSAFE_style={{ position: 'relative' }}
          >
            {/* Action Buttons */}
            <Flex justifyContent="end" gap="size-100" marginBottom="size-100">
              {readOnly && (
                <ActionButton onPress={() => handleEditSponsor(index)} isQuiet>
                  <Edit />
                  <Text>Edit</Text>
                </ActionButton>
              )}
              <ActionButton onPress={() => removeSponsor(index)} isQuiet>
                <Delete />
              </ActionButton>
            </Flex>

            {/* Main Content */}
            <Flex direction="row" gap="size-300" alignItems="start">
              {/* Image Uploader */}
              <View UNSAFE_style={{ maxWidth: '300px', flexShrink: 0 }}>
                <ImageUploader
                  label="Sponsor Logo"
                  imageUrl={sponsor.imageUrl}
                  imageId={sponsor.imageId}
                  imageKind="sponsor-logo"
                  altText={sponsor.partnerName || 'Sponsor logo'}
                  eventId={eventId ?? undefined}
                  maxSizeMB={5}
                  recommendedDimensions="400px x 200px"
                  onChange={(imageUrl, imageId) => {
                    updateSponsor(index, { imageUrl, imageId })
                  }}
                  onRemove={() => {
                    updateSponsor(index, { imageUrl: undefined, imageId: undefined })
                  }}
                  isDisabled={readOnly}
                />
              </View>

              {/* Fields */}
              <Flex direction="column" gap="size-150" width="100%">
                {seriesId && !readOnly ? (
                  <AutocompleteTextField
                    label="Partner Name"
                    value={sponsor.partnerName}
                    onChange={(value) => updateSponsor(index, { partnerName: value })}
                    onSelect={(option) => handleSelectSponsor(index, option.id)}
                    options={availableSponsors.map(s => ({
                      id: s.sponsorId,
                      label: s.name,
                      imageUrl: s.logo?.imageUrl,
                      initials: s.name?.substring(0, 2).toUpperCase()
                    }))}
                    placeholder="Type to search existing sponsors..."
                  />
                ) : (
                  <TextField
                    label="Partner Name"
                    isRequired
                    value={sponsor.partnerName}
                    onChange={(value) => updateSponsor(index, { partnerName: value })}
                    width="100%"
                    isReadOnly={readOnly}
                  />
                )}

                <TextField
                  label="Partner External URL"
                  isRequired
                  value={sponsor.partnerUrl}
                  onChange={(value) => updateSponsor(index, { partnerUrl: value })}
                  width="100%"
                  placeholder="https://..."
                  isReadOnly={readOnly}
                />
              </Flex>
            </Flex>

            {/* Save Button */}
            {!readOnly && seriesId && (
              <Flex justifyContent="end" marginTop="size-200">
                <Button 
                  variant="accent"
                  onPress={() => handleSaveSponsor(index)}
                  isDisabled={!sponsor.partnerName || savingIndex === index}
                >
                  {savingIndex === index ? (
                    <>
                      <ProgressCircle size="S" isIndeterminate aria-label="Saving" />
                      <Text>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <SaveFloppy size="S" />
                      <Text>Save to Series</Text>
                    </>
                  )}
                </Button>
              </Flex>
            )}
          </View>
        )
      })}
    </Flex>
  )
}
