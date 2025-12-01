/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
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
import { SponsorData, SeriesSponsor } from '../../types/domain'
import { ImageUploader, AutocompleteTextField } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy'
import { apiService } from '../../services/api'

interface SponsorsComponentProps {
  sponsors: SponsorData[]
  seriesId?: string
  eventId?: string
  onAddSponsor: () => void
  onRemoveSponsor: (index: number) => void
  onUpdateSponsor: (index: number, updates: Partial<SponsorData>) => void
}

export const SponsorsComponent: React.FC<SponsorsComponentProps> = ({
  sponsors,
  seriesId,
  eventId,
  onAddSponsor,
  onRemoveSponsor,
  onUpdateSponsor
}) => {
  const [availableSponsors, setAvailableSponsors] = useState<SeriesSponsor[]>([])
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  // Fetch available sponsors from series when seriesId is available
  useEffect(() => {
    let isMounted = true

    const fetchSeriesSponsors = async () => {
      if (!seriesId) return
      
      setIsLoadingSponsors(true)
      try {
        const response = await apiService.getSponsors(seriesId)
        if (isMounted && response && !('error' in response)) {
          // Transform API response to SeriesSponsor format
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

  // Handle selecting a sponsor from autocomplete
  const handleSelectSponsor = (index: number, sponsorId: string) => {
    const selectedSponsor = availableSponsors.find(s => s.sponsorId === sponsorId)
    if (selectedSponsor) {
      onUpdateSponsor(index, {
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

  // Handle saving sponsor to series
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
        // Update existing sponsor
        response = await apiService.updateSponsor(
          { ...sponsorData, modificationTime: sponsor.modificationTime },
          sponsor.sponsorId,
          seriesId,
          'en-US'
        )
      } else {
        // Create new sponsor
        response = await apiService.createSponsor(sponsorData, seriesId, 'en-US')
      }

      if (response && !('error' in response)) {
        const newSponsorId = response.sponsorId || sponsor.sponsorId
        onUpdateSponsor(index, {
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

  // Toggle edit mode for a saved sponsor
  const handleEditSponsor = (index: number) => {
    onUpdateSponsor(index, { isSaved: false })
  }

  return (
    <Flex direction="column" gap="size-200">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Sponsors & Partners</Heading>
        <Button variant="primary" onPress={onAddSponsor}>
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

      {(!sponsors || sponsors.length === 0) && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No sponsors added yet. Click "Add Sponsor" to add one.</Text>
        </View>
      )}

      {sponsors && sponsors.map((sponsor, index) => {
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
            {/* Action Buttons - Top Right */}
            <Flex justifyContent="end" gap="size-100" marginBottom="size-100">
              {readOnly && (
                <ActionButton onPress={() => handleEditSponsor(index)} isQuiet>
                  <Edit />
                  <Text>Edit</Text>
                </ActionButton>
              )}
              <ActionButton onPress={() => onRemoveSponsor(index)} isQuiet>
                <Delete />
              </ActionButton>
            </Flex>

            {/* Main Content - Image and Fields */}
            <Flex direction="row" gap="size-300" alignItems="start">
              {/* Image Uploader - Left Side */}
              <View UNSAFE_style={{ maxWidth: '300px', flexShrink: 0 }}>
                <ImageUploader
                  label="Sponsor Logo"
                  imageUrl={sponsor.imageUrl}
                  imageId={sponsor.imageId}
                  imageKind="sponsor-logo"
                  altText={sponsor.partnerName || 'Sponsor logo'}
                  eventId={eventId}
                  maxSizeMB={5}
                  recommendedDimensions="400px x 200px"
                  onChange={(imageUrl, imageId) => {
                    onUpdateSponsor(index, { 
                      imageUrl: imageUrl, 
                      imageId: imageId 
                    })
                  }}
                  onRemove={() => {
                    onUpdateSponsor(index, { 
                      imageUrl: undefined, 
                      imageId: undefined 
                    })
                  }}
                  isDisabled={readOnly}
                />
              </View>

              {/* Fields - Right Side */}
              <Flex direction="column" gap="size-150" width="100%">
                {seriesId && !readOnly ? (
                  // Autocomplete for partner name when series is available
                  <AutocompleteTextField
                    label="Partner Name"
                    value={sponsor.partnerName}
                    onChange={(value) => onUpdateSponsor(index, { partnerName: value })}
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
                    onChange={(value) => onUpdateSponsor(index, { partnerName: value })}
                    width="100%"
                    isReadOnly={readOnly}
                  />
                )}

                <TextField
                  label="Partner External URL"
                  isRequired
                  value={sponsor.partnerUrl}
                  onChange={(value) => onUpdateSponsor(index, { partnerUrl: value })}
                  width="100%"
                  placeholder="https://..."
                  isReadOnly={readOnly}
                />
              </Flex>
            </Flex>

            {/* Save Button - Bottom Right (only show when not saved) */}
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
