/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, ButtonGroup, Text, TextField, Picker, PickerItem, Dialog, DialogContainer, Content, Heading, ActionButton, ProgressCircle, Checkbox } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { SponsorData, SeriesSponsor, EventApiResponse, SponsorType } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
import { TYPOGRAPHY, SPACING, COLORS, SURFACES } from '../../styles/designSystem'
import Edit from '@react-spectrum/s2/icons/Edit'
import Add from '@react-spectrum/s2/icons/Add'
import { apiService, cachedApi } from '../../services/api'
import { getSponsorPayload } from '../../services/payloadBuilders'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Move from '@react-spectrum/s2/icons/Move'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { extractImageFromUploadResponse, uploadImage, UploadTracker } from '../../services/requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'
import { PartnerPickerDialog } from './PartnerPickerDialog'

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

type PartnerDialogSaveOptions = {
  /** DELETE series sponsor image after update (user removed logo, no new file). */
  removedSeriesSponsorImageId?: string
  /** PUT upload target when user cleared UI then picked a new file in the same edit. */
  replaceUploadImageId?: string
}

interface PartnerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    partner: SponsorData,
    pendingFile?: File,
    saveOptions?: PartnerDialogSaveOptions
  ) => Promise<void>
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
  const imageIdWhenDialogOpenedRef = useRef<string | undefined>(undefined)

  // Manage object URL lifecycle to prevent memory leaks
  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null)
      return
    }
    
    const url = URL.createObjectURL(pendingFile)
    setPreviewUrl(url)
    // Cleanup: revoke the object URL when file changes or component unmounts
    return () => {
      URL.revokeObjectURL(url)
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
      imageIdWhenDialogOpenedRef.current = partner?.imageId || undefined
    }
  }, [isOpen, partner])

  const handleSave = async () => {
    const updatedPartner: SponsorData = {
      ...partner,
      id: partner?.id || `partner-${Date.now()}`,
      partnerName: name,
      partnerUrl: website,
      // Omit stale URL while a new file is queued (preview uses object URL).
      imageUrl: pendingFile ? undefined : imageUrl,
      // Keep imageId when replacing: uploadImage uses it for PUT .../images/{imageId}.
      // Clearing it forced POST and broke replacement for sponsors that already had a logo.
      imageId,
    }
    const openedId = imageIdWhenDialogOpenedRef.current
    const removedSeriesSponsorImageId =
      !isNew && openedId && !imageId && !pendingFile ? openedId : undefined
    const replaceUploadImageId =
      !isNew && pendingFile && !imageId && openedId ? openedId : undefined
    await onSave(updatedPartner, pendingFile, {
      removedSeriesSponsorImageId,
      replaceUploadImageId,
    })
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
        <Dialog size="L">
          {() => (
            <>
              <Heading slot="title">{isNew ? 'Add new partner' : 'Edit partner'}</Heading>
              <Content>
                <div className={style({display: 'flex', gap: 32, alignItems: 'start'})}>
                  {/* Image Upload Section */}
                  <div style={{ textAlign: 'center' }}>
                    <ImageUploader
                      label=""
                      imageUrl={previewUrl || imageUrl}
                      imageId={imageId}
                      imageKind="sponsor-image"
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
                  </div>

                  {/* Form Fields Section */}
                  <div className={style({display: 'flex', flexDirection: 'column', gap: 16, flexGrow: 1})}>
                    <TextField
                      label="Partner name"
                      value={name}
                      onChange={setName}
                      placeholder="Partner name"
                      styles={style({ width: '[100%]' })}
                      isRequired
                    />
                    <TextField
                      label="Partner website"
                      value={website}
                      onChange={setWebsite}
                      placeholder="www.example.com"
                      styles={style({ width: '[100%]' })}
                      isRequired
                    />
                  </div>
                </div>
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
            </>
          )}
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
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}

const PartnerCard: React.FC<PartnerCardProps> = ({
  partner,
  onEdit,
  onRemove,
  onTierChange,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const currentTier = TIER_OPTIONS.find(t => t.key === partner.type) || TIER_OPTIONS[0]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        border: isDragOver
          ? `2px solid ${SURFACES.SELECTED_RING}`
          : `1px solid ${SURFACES.BORDER}`,
        borderRadius: '4px',
        padding: '16px',
        backgroundColor: isDragging ? SURFACES.SUBTLE : SURFACES.CANVAS,
        opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <div className={style({display: 'flex', alignItems: 'center', gap: 16})}>
        <span style={{ flexShrink: 0, cursor: 'grab', display: 'flex' }} aria-hidden>
          <Move />
        </span>
        {/* Partner Logo */}
        <div
          style={{
            width: '64px',
            height: '48px',
            borderRadius: '2px',
            border: '1px solid var(--spectrum-global-color-gray-300)',
            backgroundColor: 'white',
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
            <div
              style={{
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
            </div>
          )}
        </div>

        {/* Partner Info */}
        <div className={style({display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 4})}>
          <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
            <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontSize: '16px' }}>
              {partner.partnerName || 'Untitled Partner'}
            </Text>

            {/* Inline Tier Picker */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: `${SPACING.XS}px`,
                padding: `0 ${SPACING.XS}px`,
                border: '1px solid var(--spectrum-global-color-gray-300)',
                borderRadius: '2px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              {currentTier.color !== 'transparent' && (
                <div
                  style={{
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
                  <PickerItem key={option.key} id={option.key}>{option.label}</PickerItem>
                ))}
              </Picker>
            </div>
          </div>

          {partner.partnerUrl && (
            <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
              {partner.partnerUrl}
            </Text>
          )}
        </div>

        {/* Action Buttons */}
        <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
          <ActionButton onPress={onEdit} isQuiet aria-label="Edit partner">
            <Edit />
          </ActionButton>
          <ActionButton onPress={onRemove} isQuiet aria-label="Remove partner">
            <RemoveCircle />
          </ActionButton>
        </div>
      </div>
    </div>
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
    seriesId: contextSeriesId,
    locale,
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
      // API requires: sponsorId, sponsorType (PascalCase enum), ordinal (per-tier position)
      const tierOrdinalCounters: Record<string, number> = {}
      const currentSponsors = sponsors
        .filter(s => s.sponsorId && (s.isSaved || s.isFromSeries))
        .map(s => {
          const sponsorType = s.type || 'Partner' as SponsorType
          if (tierOrdinalCounters[sponsorType] === undefined) tierOrdinalCounters[sponsorType] = 0
          const ordinal = tierOrdinalCounters[sponsorType]++
          return { sponsorId: s.sponsorId!, sponsorType, ordinal }
        })
      
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
            // Check if sponsor exists with same type and ordinal
            const existingSponsor = savedSponsors.find((saved: any) =>
              saved.sponsorId === eventSponsor.sponsorId &&
              saved.sponsorType === eventSponsor.sponsorType &&
              saved.ordinal === eventSponsor.ordinal
            )
            
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

  // Use formData.seriesId when context seriesId is empty (e.g. when editing a loaded event)
  const seriesId = contextSeriesId || formData.seriesId || ''
  
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
  
  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false)

  // Drag state (per-group)
  const [draggedItem, setDraggedItem] = useState<{ tier: string; idx: number } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ tier: string; idx: number } | null>(null)

  const groupedSponsors = useMemo(() => {
    const map = new Map<string, { sponsor: SponsorData; globalIndex: number }[]>()
    TIER_OPTIONS.filter(t => t.key !== 'select').forEach(opt => map.set(opt.key, []))
    map.set('unassigned', [])
    sponsors.forEach((sponsor, globalIndex) => {
      const tier = sponsor.type || 'unassigned'
      if (!map.has(tier)) map.set(tier, [])
      map.get(tier)!.push({ sponsor, globalIndex })
    })
    for (const [key, items] of map) {
      if (items.length === 0) map.delete(key)
    }
    return map
  }, [sponsors])

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

  const removeSponsor = useCallback((index: number) => {
    updateFormData({ sponsors: sponsors.filter((_, i) => i !== index) })
  }, [sponsors, updateFormData])

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

  const handlePickerSelect = useCallback((partner: SponsorData) => {
    updateFormData({ sponsors: [...sponsors, partner] })
  }, [sponsors, updateFormData])

  const refreshSeriesSponsors = useCallback(async () => {
    if (!seriesId) return
    try {
      const response = await cachedApi.getSponsors(seriesId)
      if (response && !('error' in response)) {
        setAvailableSponsors(response.sponsors || response || [])
      }
    } catch (error) {
      console.error('Failed to refresh series sponsors:', error)
    }
  }, [seriesId])

  const handleTierChange = (globalIndex: number, tier: SponsorType) => {
    const updated = sponsors.map((s, i) => i === globalIndex ? { ...s, type: tier } : s)
    const moved = updated[globalIndex]
    const without = updated.filter((_, i) => i !== globalIndex)
    let insertAt = without.length
    for (let i = without.length - 1; i >= 0; i--) {
      if (without[i].type === tier) {
        insertAt = i + 1
        break
      }
    }
    updateFormData({ sponsors: [...without.slice(0, insertAt), moved, ...without.slice(insertAt)] })
  }

  const handleDragStart = (e: React.DragEvent, tier: string, idx: number) => {
    setDraggedItem({ tier, idx })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${tier}:${idx}`)
  }

  const handleDragOver = (e: React.DragEvent, tier: string, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedItem !== null && draggedItem.tier === tier && draggedItem.idx !== idx) {
      setDragOverItem({ tier, idx })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, tier: string, dropIdx: number) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.tier !== tier || draggedItem.idx === dropIdx) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }
    const groupItems = groupedSponsors.get(tier) || []
    const groupSponsors = groupItems.map(item => item.sponsor)
    const [dragged] = groupSponsors.splice(draggedItem.idx, 1)
    groupSponsors.splice(dropIdx, 0, dragged)
    const sortedGlobalIndices = groupItems.map(item => item.globalIndex).sort((a, b) => a - b)
    const newSponsors = [...sponsors]
    sortedGlobalIndices.forEach((globalIdx, i) => {
      newSponsors[globalIdx] = groupSponsors[i]
    })
    updateFormData({ sponsors: newSponsors })
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
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
      const token = apiService.getAuthTokenForExternalUse()
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
        type: 'sponsor-image'
      }

      const result = await uploadImage(file, config, token, tracker, existingImageId)
      return extractImageFromUploadResponse(result)
    } catch (err) {
      console.error('Failed to upload sponsor image:', err)
      return null
    }
  }

  const handleDialogSave = async (
    partner: SponsorData,
    pendingFile?: File,
    saveOptions?: PartnerDialogSaveOptions
  ) => {
    const removedSeriesSponsorImageId = saveOptions?.removedSeriesSponsorImageId
    const replaceUploadImageId = saveOptions?.replaceUploadImageId
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
        const recordForPayload: Record<string, unknown> = {
          sponsorId: partner.sponsorId,
          name: sponsorData.name,
          link: sponsorData.link,
        }
        if (partner.modificationTime != null) {
          recordForPayload.modificationTime = partner.modificationTime
        }
        if (partner.info) {
          recordForPayload.info = partner.info
        }
        const updatePayload = await getSponsorPayload(
          recordForPayload as Record<string, any>,
          locale,
          seriesId
        )
        response = await apiService.updateSponsor(
          updatePayload,
          partner.sponsorId!,
          seriesId,
          locale
        )
      } else {
        response = await apiService.createSponsor(sponsorData, seriesId, locale)
      }

      if (response && !('error' in response)) {
        const savedSponsor = response.sponsor || response
        const sponsorId = savedSponsor.sponsorId || partner.sponsorId

        if (removedSeriesSponsorImageId && sponsorId && seriesId) {
          const delResult = await cachedApi.deleteSponsorImage(
            seriesId,
            sponsorId,
            removedSeriesSponsorImageId
          )
          if (delResult && 'error' in delResult) {
            console.error('Failed to delete sponsor image:', delResult)
          }
        }
        
        // Upload pending image if there is one
        let uploadedImage: { imageUrl: string; imageId: string } | null = null
        
        if (pendingFile && sponsorId) {
          const altText = partner.partnerName || 'Partner logo'
          uploadedImage = await uploadSponsorImage(
            pendingFile,
            sponsorId,
            altText,
            partner.imageId || replaceUploadImageId
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

  const selectedSponsorIds = useMemo(() => {
    return new Set(sponsors.map(s => s.sponsorId).filter(Boolean) as string[])
  }, [sponsors])

  const includePartners = formData.showSponsors ?? true

  const handleIncludePartnersChange = (value: boolean) => {
    updateFormData({ showSponsors: value })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
      {/* Header */}
      <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16})}>
        <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
          <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
            Partners
          </Heading>
          {isLoadingSponsors && (
            <ProgressCircle isIndeterminate aria-label="Loading partners" />
          )}
        </div>
        <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 4})}>
          <Checkbox
            data-testid="include-partners-checkbox"
            isSelected={includePartners}
            onChange={handleIncludePartnersChange}
          >
            Include partners
          </Checkbox>
          <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
            (Partners are optional)
          </Text>
        </div>
      </div>

      <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
        Add partners to your event landing page. Drag to reorder within each tier group. You can change each partner&apos;s tier for this event.
      </Text>

      {sponsors.length > 0 && (
        <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT, fontStyle: 'italic' }}>
          The order of tier groups shown here does not determine how they appear on the event landing page. Tier group sequencing is controlled by the page template configuration in the DA authoring documentation.
        </Text>
      )}

      {sponsors.length === 0 && (
        <div style={{ padding: '32px', backgroundColor: 'var(--spectrum-global-color-gray-100)', borderRadius: '4px', textAlign: 'center' }}>
          <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16})}>
            <Text>Add partners to your event using the button below.</Text>
            <Button data-testid="add-sponsor-button" variant="secondary" onPress={() => setPickerOpen(true)}>
              <Add />
              <Text>Add Partner</Text>
            </Button>
          </div>
        </div>
      )}

      {sponsors.length > 0 && (
        <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
          {Array.from(groupedSponsors.entries()).map(([tier, groupItems]) => {
            const tierOption = tier === 'unassigned'
              ? { label: 'Unassigned', color: 'transparent' }
              : TIER_OPTIONS.find(t => t.key === tier)
            const tierLabel = tierOption?.label ?? tier
            const tierColor = tierOption?.color ?? 'transparent'
            return (
              <div
                key={tier}
                style={{
                  border: `1px solid ${SURFACES.BORDER}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    backgroundColor: SURFACES.SUBTLE,
                    borderBottom: `1px solid ${SURFACES.BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {tierColor !== 'transparent' && (
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: tierColor,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontWeight: 600 }}>{tierLabel}</Text>
                  <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT }}>
                    {groupItems.length} {groupItems.length === 1 ? 'partner' : 'partners'}
                  </Text>
                </div>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 0})}>
                  {groupItems.map(({ sponsor, globalIndex }, groupIdx) => (
                    <div
                      key={sponsor.id || globalIndex}
                      style={{
                        borderBottom: groupIdx < groupItems.length - 1 ? `1px solid ${SURFACES.BORDER}` : 'none',
                      }}
                    >
                      <PartnerCard
                        partner={sponsor}
                        onEdit={() => handleEditClick(globalIndex)}
                        onRemove={() => removeSponsor(globalIndex)}
                        onTierChange={(newTier) => handleTierChange(globalIndex, newTier)}
                        isDragging={draggedItem?.tier === tier && draggedItem.idx === groupIdx}
                        isDragOver={dragOverItem?.tier === tier && dragOverItem.idx === groupIdx}
                        onDragStart={(e) => handleDragStart(e, tier, groupIdx)}
                        onDragOver={(e) => handleDragOver(e, tier, groupIdx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, tier, groupIdx)}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sponsors.length > 0 && (
        <Button
          data-testid="add-sponsor-button"
          variant="secondary"
          onPress={() => setPickerOpen(true)}
          styles={style({ width: '[100%]' })}
          UNSAFE_style={{
            backgroundColor: SURFACES.PILL_BG,
            border: 'none',
            color: COLORS.DARK_GRAY,
            justifyContent: 'flex-start',
            paddingLeft: '16px',
          }}
        >
          <Add />
          <Text>Add Partner</Text>
        </Button>
      )}

      {/* Partner Picker Dialog (select existing or create new) */}
      <PartnerPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        seriesSponsors={availableSponsors}
        selectedSponsorIds={selectedSponsorIds}
        seriesId={seriesId}
        locale={locale}
        onSponsorsRefresh={refreshSeriesSponsors}
      />

      {/* Partner Edit Dialog */}
      <PartnerDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        partner={editingPartner}
        isNew={editingIndex === null}
        isSaving={isSaving}
      />
    </div>
  )
}
