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
  Item,
  Dialog,
  DialogContainer,
  Divider,
  Content,
  ButtonGroup,
  ComboBox
} from '@adobe/react-spectrum'
import { SponsorData, SeriesSponsor, EventApiResponse, SponsorType } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
import { TYPOGRAPHY, SPACING, COLORS, FLEX_GAP } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Edit from '@spectrum-icons/workflow/Edit'
import Remove from '@spectrum-icons/workflow/Remove'
import DragHandle from '@spectrum-icons/workflow/DragHandle'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import Info from '@spectrum-icons/workflow/Info'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { apiService, cachedApi } from '../../services/api'
import RemoveCircle from '@spectrum-icons/workflow/RemoveCircle'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'

// ============================================================================
// TIER OPTIONS WITH COLORS
// ============================================================================

interface TierOption {
  key: SponsorType | 'select'
  label: string
  color: string
}

const TIER_OPTIONS: TierOption[] = [
  { key: 'select', label: 'Select tier', color: 'transparent' },
  { key: 'Diamond', label: 'Diamond', color: '#B9F2FF' },
  { key: 'Platinum', label: 'Platinum', color: '#E5E4E2' },
  { key: 'Gold', label: 'Gold', color: '#FFD700' },
  { key: 'Silver', label: 'Silver', color: '#C0C0C0' },
  { key: 'Bronze', label: 'Bronze', color: '#CD7F32' },
  { key: 'Engagement', label: 'Engagement', color: '#9B59B6' },
  { key: 'Partner', label: 'Partner', color: '#3498DB' },
]

// ============================================================================
// PARTNER DIALOG COMPONENT
// ============================================================================

interface PartnerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (partner: SponsorData, pendingFile?: File) => Promise<void>
  partner?: SponsorData
  isNew: boolean
  isSaving: boolean
}

const PartnerDialog: React.FC<PartnerDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  partner,
  isNew,
  isSaving
}) => {
  const [name, setName] = useState(partner?.partnerName || '')
  const [website, setWebsite] = useState(partner?.partnerUrl || '')
  const [imageUrl, setImageUrl] = useState(partner?.imageUrl || '')
  const [imageId, setImageId] = useState(partner?.imageId || '')
  const [pendingFile, setPendingFile] = useState<File | undefined>()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Manage object URL lifecycle to prevent memory leaks
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile)
      setPreviewUrl(url)
      // Cleanup: revoke the object URL when file changes or component unmounts
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [pendingFile])

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (isOpen) {
      setName(partner?.partnerName || '')
      setWebsite(partner?.partnerUrl || '')
      setImageUrl(partner?.imageUrl || '')
      setImageId(partner?.imageId || '')
      setPendingFile(undefined)
    }
  }, [isOpen, partner])

  const handleSave = async () => {
    const updatedPartner: SponsorData = {
      ...partner,
      id: partner?.id || `partner-${Date.now()}`,
      partnerName: name,
      partnerUrl: website,
      imageUrl: pendingFile ? undefined : imageUrl,
      imageId: pendingFile ? undefined : imageId,
    }
    await onSave(updatedPartner, pendingFile)
  }

  const handleFileSelected = (file: File) => {
    setPendingFile(file)
  }

  const handleImageRemove = () => {
    setPendingFile(undefined)
    setImageUrl('')
    setImageId('')
  }

  const isValid = name.trim() !== '' && website.trim() !== ''

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="L" isDismissable>
          <Heading>{isNew ? 'Add new partner' : 'Edit partner'}</Heading>
          <Divider />
          <Content>
            <Flex gap={FLEX_GAP.LARGE} alignItems="start">
              {/* Image Upload Section */}
              <View UNSAFE_style={{ textAlign: 'center' }}>
                <ImageUploader
                  label=""
                  imageUrl={previewUrl || imageUrl}
                  imageId={imageId}
                  imageKind="sponsor-logo"
                  altText={name || 'Partner logo'}
                  maxSizeMB={25}
                  width={280}
                  dropzoneTitle="Add partner image"
                  dropzoneDimensions="Dimensions 584px x 306px. Does not exceed 25mb"
                  deferUpload={true}
                  pendingFile={pendingFile}
                  onFileSelected={handleFileSelected}
                  onChange={(url, id) => {
                    setImageUrl(url)
                    setImageId(id)
                  }}
                  onRemove={handleImageRemove}
                />
              </View>

              {/* Form Fields Section */}
              <Flex direction="column" gap={FLEX_GAP.FIELD} flex={1}>
                <TextField
                  label="Partner name"
                  value={name}
                  onChange={setName}
                  placeholder="Partner name"
                  width="100%"
                  isRequired
                />
                <TextField
                  label="Partner website"
                  value={website}
                  onChange={setWebsite}
                  placeholder="www.example.com"
                  width="100%"
                  isRequired
                />
              </Flex>
            </Flex>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button 
              variant="accent" 
              onPress={handleSave} 
              isDisabled={!isValid || isSaving}
            >
              {isSaving ? (
                <ProgressCircle size="S" isIndeterminate aria-label="Saving" />
              ) : (
                isNew ? 'Create' : 'Save'
              )}
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogContainer>
  )
}

// ============================================================================
// PARTNER CARD COMPONENT
// ============================================================================

interface PartnerCardProps {
  partner: SponsorData
  onEdit: () => void
  onRemove: () => void
  onTierChange: (tier: SponsorType) => void
}

const PartnerCard: React.FC<PartnerCardProps> = ({
  partner,
  onEdit,
  onRemove,
  onTierChange
}) => {
  const currentTier = TIER_OPTIONS.find(t => t.key === partner.type) || TIER_OPTIONS[0]

  return (
    <View
      borderWidth="thin"
      borderColor="dark"
      borderRadius="medium"
      padding="size-200"
      backgroundColor="gray-50"
    >
      <Flex alignItems="center" gap={FLEX_GAP.FIELD}>
        {/* Partner Logo */}
        <View 
          width="size-800" 
          height="size-600"
          borderRadius="small"
          borderWidth="thin"
          borderColor="gray-300"
          backgroundColor="static-white"
          UNSAFE_style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {partner.imageUrl ? (
            <img
              src={partner.imageUrl}
              alt={partner.partnerName || 'Partner logo'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <View
              UNSAFE_style={{
                width: '100%',
                height: '100%',
                backgroundColor: COLORS.GRAY_200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...TYPOGRAPHY.FIELD_LABEL,
                color: COLORS.GRAY_600,
              }}
            >
              {partner.partnerName?.substring(0, 2).toUpperCase() || 'P'}
            </View>
          )}
        </View>

        {/* Partner Info */}
        <Flex direction="column" flex={1} gap="size-50">
          <Flex alignItems="center" gap={FLEX_GAP.SMALL}>
            <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontSize: '16px' }}>
              {partner.partnerName || 'Untitled Partner'}
            </Text>
            
            {/* Inline Tier Picker */}
            <View
              borderRadius="small"
              borderWidth="thin"
              borderColor="gray-300"
              backgroundColor="static-white"
              UNSAFE_style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: `${SPACING.XS}px`,
                padding: `0 ${SPACING.XS}px`,
                cursor: 'pointer',
              }}
            >
              {currentTier.color !== 'transparent' && (
                <View
                  UNSAFE_style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: `${SPACING.XXS}px`,
                    backgroundColor: currentTier.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <Picker
                aria-label="Partner tier"
                selectedKey={partner.type || 'select'}
                onSelectionChange={(key) => {
                  if (key !== 'select') {
                    onTierChange(key as SponsorType)
                  }
                }}
                UNSAFE_style={{ width: '100%', padding: '0px' }}
                isQuiet
              >
                {TIER_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>
            </View>
          </Flex>
          
          {partner.partnerUrl && (
            <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
              {partner.partnerUrl}
            </Text>
          )}
        </Flex>

        {/* Action Buttons */}
        <Flex gap={FLEX_GAP.TIGHT} alignItems="center">
          <ActionButton onPress={onEdit} isQuiet aria-label="Edit partner">
            <Edit size="S" />
          </ActionButton>
          <ActionButton onPress={onRemove} isQuiet aria-label="Remove partner">
            <RemoveCircle size="S" />
          </ActionButton>
        </Flex>
      </Flex>
    </View>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SponsorsComponent - Manages partner information
 * 
 * Uses EventFormContext for state management.
 * Handles:
 * - Adding/removing partners
 * - Search from series partners
 * - Saving partners to series
 * - Event-level partner association (add, update, remove)
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
        const sponsorsResponse = await cachedApi.getEventSponsors(savedEventId)
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
  const [isSaving, setIsSaving] = useState(false)
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<SponsorData | undefined>()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    let isMounted = true

    const fetchSeriesSponsors = async () => {
      if (!seriesId) return
      
      setIsLoadingSponsors(true)
      try {
        const response = await cachedApi.getSponsors(seriesId)
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

  const updateSponsor = useCallback((index: number, updates: Partial<SponsorData>) => {
    const updated = [...sponsors]
    updated[index] = { ...updated[index], ...updates }
    updateFormData({ sponsors: updated })
  }, [sponsors, updateFormData])

  const removeSponsor = useCallback((index: number) => {
    updateFormData({ sponsors: sponsors.filter((_, i) => i !== index) })
  }, [sponsors, updateFormData])

  const handleAddNewClick = () => {
    setEditingPartner(undefined)
    setEditingIndex(null)
    setIsDialogOpen(true)
  }

  const handleEditClick = (index: number) => {
    setEditingPartner(sponsors[index])
    setEditingIndex(index)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingPartner(undefined)
    setEditingIndex(null)
  }

  const handleSelectFromSearch = (sponsorId: string | null) => {
    if (!sponsorId) return
    
    const selectedSponsor = availableSponsors.find(s => s.sponsorId === sponsorId)
    if (selectedSponsor) {
      const imageData = selectedSponsor.image || selectedSponsor.logo
      const newPartner: SponsorData = {
        id: `partner-${Date.now()}`,
        sponsorId: selectedSponsor.sponsorId,
        partnerName: selectedSponsor.name,
        partnerUrl: selectedSponsor.externalUrl || selectedSponsor.link || '',
        imageUrl: imageData?.imageUrl,
        imageId: imageData?.imageId,
        isSaved: true,
        isFromSeries: true,
        modificationTime: selectedSponsor.modificationTime
      }
      updateFormData({ sponsors: [...sponsors, newPartner] })
      setSearchQuery('')
    }
  }

  const handleTierChange = (index: number, tier: SponsorType) => {
    updateSponsor(index, { type: tier })
  }

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

  const handleDialogSave = async (partner: SponsorData, pendingFile?: File) => {
    if (!seriesId) return
    
    setIsSaving(true)
    try {
      // Validate URL format
      let partnerUrl = partner.partnerUrl || ''
      if (partnerUrl && !partnerUrl.startsWith('https://')) {
        if (partnerUrl.startsWith('http://')) {
          partnerUrl = partnerUrl.replace('http://', 'https://')
        } else if (partnerUrl.startsWith('www.')) {
          partnerUrl = `https://${partnerUrl}`
        } else {
          partnerUrl = `https://${partnerUrl}`
        }
      }

      const sponsorData = {
        name: partner.partnerName || '',
        link: partnerUrl
      }

      let response
      const isExisting = partner.sponsorId && (partner.isSaved || partner.isFromSeries)
      
      if (isExisting) {
        response = await apiService.updateSponsor(
          { ...sponsorData, modificationTime: partner.modificationTime },
          partner.sponsorId!,
          seriesId,
          'en-US'
        )
      } else {
        response = await apiService.createSponsor(sponsorData, seriesId, 'en-US')
      }

      if (response && !('error' in response)) {
        const savedSponsor = response.sponsor || response
        const sponsorId = savedSponsor.sponsorId || partner.sponsorId
        
        // Upload pending image if there is one
        let uploadedImage: { imageUrl: string; imageId: string } | null = null
        
        if (pendingFile && sponsorId) {
          const altText = partner.partnerName || 'Partner logo'
          uploadedImage = await uploadSponsorImage(
            pendingFile, 
            sponsorId, 
            altText,
            partner.imageId
          )
        }
        
        const updatedPartner: SponsorData = {
          ...partner,
          sponsorId: sponsorId,
          partnerUrl: partnerUrl,
          isSaved: true,
          isFromSeries: true,
          modificationTime: savedSponsor.modificationTime,
          ...(uploadedImage ? {
            imageUrl: uploadedImage.imageUrl,
            imageId: uploadedImage.imageId
          } : {})
        }

        if (editingIndex !== null) {
          // Update existing
          const updated = [...sponsors]
          updated[editingIndex] = updatedPartner
          updateFormData({ sponsors: updated })
        } else {
          // Add new
          updateFormData({ sponsors: [...sponsors, updatedPartner] })
        }

        // Refresh the available sponsors list
        const updatedResponse = await cachedApi.getSponsors(seriesId)
        if (updatedResponse && !('error' in updatedResponse)) {
          setAvailableSponsors(updatedResponse.sponsors || updatedResponse || [])
        }
        
        handleDialogClose()
      } else {
        console.error('Failed to save partner:', response)
      }
    } catch (error) {
      console.error('Failed to save partner:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter available sponsors for search (exclude already added)
  const filteredAvailableSponsors = availableSponsors.filter(s => {
    const alreadyAdded = sponsors.some(existing => existing.sponsorId === s.sponsorId)
    if (alreadyAdded) return false
    if (!searchQuery) return true
    return s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.FIELD}>
      {/* Header */}
      <Flex alignItems="center" gap={FLEX_GAP.SMALL}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Partners (optional)
        </Heading>
        {isLoadingSponsors && (
          <ProgressCircle size="S" isIndeterminate aria-label="Loading partners" />
        )}
      </Flex>

      <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
        Add partners to your event landing page.
      </Text>

      {/* Controls Bar */}
      <Flex gap={FLEX_GAP.NONE} alignItems="stretch" marginTop={FLEX_GAP.TIGHT} width="100%">
        {/* Search Partners Dropdown */}
        <View flex={1}>
          <ComboBox
            label=""
            aria-label="Search partners"
            placeholder="Search partners"
            inputValue={searchQuery}
            onInputChange={setSearchQuery}
            onSelectionChange={(key) => handleSelectFromSearch(key as string)}
            items={filteredAvailableSponsors.map(s => ({ id: s.sponsorId, name: s.name }))}
            width="100%"
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </ComboBox>
        </View>

        {/* Vertical Divider - 40px spacing on each side (SPACING.XXL / size-500) */}
        <Divider orientation="vertical" size="S" marginX="size-500" />

        {/* Add New Partner Button */}
        <View flex={1}>
          <Button
            variant="secondary"
            onPress={handleAddNewClick}
            width="100%"
            UNSAFE_style={{
              backgroundColor: COLORS.GRAY_200,
              borderRadius: `${SPACING.LG}px`,
              border: 'none',
            }}
          >
            <Add size="S" />
            <Text>Add new partner</Text>
          </Button>
        </View>
      </Flex>

      {/* Divider */}
      <Divider size="S" marginTop={FLEX_GAP.TIGHT} />

      {/* Partner List or Empty State */}
      {sponsors.length === 0 ? (
        <View
          padding={FLEX_GAP.LARGE}
          backgroundColor="gray-100"
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <Text UNSAFE_style={{ color: COLORS.GRAY_700 }}>
            No partners have been added yet for this event
          </Text>
        </View>
      ) : (
        <Flex direction="column" gap={FLEX_GAP.SMALL}>
          {sponsors.map((partner, index) => (
            <PartnerCard
              key={partner.id || index}
              partner={partner}
              onEdit={() => handleEditClick(index)}
              onRemove={() => removeSponsor(index)}
              onTierChange={(tier) => handleTierChange(index, tier)}
            />
          ))}
        </Flex>
      )}

      {/* Partner Dialog */}
      <PartnerDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        partner={editingPartner}
        isNew={editingIndex === null}
        isSaving={isSaving}
      />
    </Flex>
  )
}
