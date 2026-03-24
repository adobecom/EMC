/* 
* <license header>
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContainer,
  Content,
  TextField,
  View,
  Flex,
  Text,
  ActionButton,
  ProgressCircle,
  SearchField,
} from '@adobe/react-spectrum'
import { Button } from '@react-spectrum/s2'
import Add from '@spectrum-icons/workflow/Add'
import ArrowLeft from '@spectrum-icons/workflow/ArrowLeft'
import { SeriesSponsor, SponsorData } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import { apiService, cachedApi } from '../../services/api'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'
import { useToast } from '../../contexts'

interface PartnerPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (partner: SponsorData) => void
  seriesSponsors: SeriesSponsor[]
  selectedSponsorIds: Set<string>
  seriesId: string
  onSponsorsRefresh: () => void
}

/** Fetch series sponsors - used when dialog opens to ensure data is loaded */
async function fetchSeriesSponsors(seriesId: string): Promise<SeriesSponsor[]> {
  if (!seriesId) return []
  const response = await cachedApi.getSponsors(seriesId)
  if (response && !('error' in response)) {
    const list = response.sponsors || response || []
    return Array.isArray(list) ? list : []
  }
  return []
}

interface CreateFormState {
  name: string
  website: string
  imageUrl?: string
  imageId?: string
}

const initialCreateFormState: CreateFormState = {
  name: '',
  website: '',
}

export const PartnerPickerDialog: React.FC<PartnerPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  seriesSponsors,
  selectedSponsorIds,
  seriesId,
  onSponsorsRefresh,
}) => {
  const [view, setView] = useState<'select' | 'create'>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [localSponsors, setLocalSponsors] = useState<SeriesSponsor[]>([])
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (isOpen) {
      setView('select')
      setSearchQuery('')
      setSelectedSponsorId(null)
      setCreateForm(initialCreateFormState)
      setPendingFile(null)
      setIsCreating(false)
    }
  }, [isOpen])

  // Fetch series sponsors when dialog opens (ensures network call happens when user opens picker)
  useEffect(() => {
    if (isOpen && seriesId) {
      setIsLoadingSponsors(true)
      fetchSeriesSponsors(seriesId)
        .then((sponsors) => setLocalSponsors(sponsors))
        .catch((err) => {
          console.error('Failed to fetch series sponsors:', err)
          setLocalSponsors([])
        })
        .finally(() => setIsLoadingSponsors(false))
    } else {
      setLocalSponsors([])
    }
  }, [isOpen, seriesId])

  const sponsorsToShow = localSponsors.length > 0 ? localSponsors : seriesSponsors

  const availableSponsors = useMemo(() => {
    return sponsorsToShow.filter(s => !selectedSponsorIds.has(s.sponsorId))
  }, [sponsorsToShow, selectedSponsorIds])

  const filteredSponsors = useMemo(() => {
    if (!searchQuery.trim()) return availableSponsors
    const q = searchQuery.toLowerCase().trim()
    return availableSponsors.filter(s =>
      (s.name || '').toLowerCase().includes(q)
    )
  }, [availableSponsors, searchQuery])

  const handleSelectConfirm = useCallback(() => {
    if (!selectedSponsorId) return
    const sponsor = sponsorsToShow.find(s => s.sponsorId === selectedSponsorId)
    if (sponsor) {
      const imageData = sponsor.image || sponsor.logo
      const partnerData: SponsorData = {
        id: `partner-${Date.now()}`,
        sponsorId: sponsor.sponsorId,
        partnerName: sponsor.name,
        partnerUrl: sponsor.externalUrl || sponsor.link || '',
        imageUrl: imageData?.imageUrl,
        imageId: imageData?.imageId,
        isSaved: true,
        isFromSeries: true,
        modificationTime: sponsor.modificationTime,
      }
      onSelect(partnerData)
      onClose()
    }
  }, [selectedSponsorId, sponsorsToShow, onSelect, onClose])

  const updateCreateField = useCallback((field: keyof CreateFormState, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const isCreateFormValid = createForm.name.trim() !== '' && createForm.website.trim() !== ''

  const handleCreatePartner = useCallback(async () => {
    if (!isCreateFormValid) {
      toast.error('Please enter partner name and website')
      return
    }
    if (!seriesId) {
      toast.error('Unable to add partner: no series selected')
      return
    }
    setIsCreating(true)

    try {
      let partnerUrl = createForm.website
      if (partnerUrl && !partnerUrl.startsWith('https://')) {
        if (partnerUrl.startsWith('http://')) {
          partnerUrl = partnerUrl.replace('http://', 'https://')
        } else {
          partnerUrl = `https://${partnerUrl}`
        }
      }

      const sponsorPayload = {
        name: createForm.name.trim(),
        link: partnerUrl,
      }

      const response = await apiService.createSponsor(sponsorPayload, seriesId, 'en-US')

      if (response && !('error' in response)) {
        const savedSponsor = response.sponsor || response
        const sponsorId = savedSponsor.sponsorId

        let uploadedImage: { imageUrl: string; imageId: string } | null = null
        if (pendingFile && sponsorId) {
          try {
            const token = apiService.getAuthTokenForExternalUse()
            if (token) {
              const env = getCurrentEnvironment()
              const host = getApiHost('esp', env)
              const uploadUrl = `${host}/v1/series/${seriesId}/sponsors/${sponsorId}/images`
              const tracker: UploadTracker = { progress: 0 }
              const config = {
                targetUrl: uploadUrl,
                altText: createForm.name || 'Partner logo',
                type: 'sponsor-logo',
              }
              const result = await uploadImage(pendingFile, config, token, tracker)
              const imageData = result.image || result
              if (imageData.imageUrl && imageData.imageId) {
                uploadedImage = { imageUrl: imageData.imageUrl, imageId: imageData.imageId }
              }
            }
          } catch (err) {
            console.error('Failed to upload sponsor image:', err)
          }
        }

        onSponsorsRefresh()

        const newPartner: SponsorData = {
          id: `partner-${Date.now()}`,
          sponsorId,
          partnerName: createForm.name.trim(),
          partnerUrl,
          isSaved: true,
          isFromSeries: true,
          modificationTime: savedSponsor.modificationTime,
          ...(uploadedImage ? {
            imageUrl: uploadedImage.imageUrl,
            imageId: uploadedImage.imageId,
          } : {}),
        }

        onSelect(newPartner)
        onClose()
      } else {
        const errMsg = (response as { error?: string })?.error || 'Failed to create partner'
        toast.error(errMsg)
        console.error('Failed to create partner:', response)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to create partner'
      toast.error(errMsg)
      console.error('Failed to create partner:', error)
    } finally {
      setIsCreating(false)
    }
  }, [createForm, pendingFile, seriesId, isCreateFormValid, onSelect, onClose, onSponsorsRefresh, toast])

  const handleSwitchToCreate = useCallback(() => {
    setView('create')
    setCreateForm(initialCreateFormState)
    setPendingFile(null)
  }, [])

  const handleBackToSelect = useCallback(() => {
    setView('select')
  }, [])

  const renderSelectView = () => (
    <>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Flex alignItems="center" gap="size-100">
          <Text UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Select Partner</Text>
          {isLoadingSponsors && (
            <ProgressCircle size="S" isIndeterminate aria-label="Loading partners" />
          )}
        </Flex>
        <Flex gap="size-100" alignItems="center">
          <ActionButton onPress={handleSwitchToCreate} aria-label="Create new partner">
            <Add />
          </ActionButton>
          <Button
            variant="accent"
            onPress={handleSelectConfirm}
            isDisabled={!selectedSponsorId}
          >
            <Text>Select</Text>
          </Button>
        </Flex>
      </Flex>

      <SearchField
        label="Search partners"
        value={searchQuery}
        onChange={setSearchQuery}
        width="100%"
        marginBottom="size-300"
      />

      {filteredSponsors.length === 0 ? (
        <View padding="size-400" UNSAFE_style={{ textAlign: 'center' }}>
          <Text>No partners available. Create a new one using the + button above.</Text>
        </View>
      ) : (
        <Flex direction="column" gap="size-100">
          {filteredSponsors.map((sponsor) => {
            const imageData = sponsor.image || sponsor.logo
            const isSelected = selectedSponsorId === sponsor.sponsorId
            return (
              <div
                key={sponsor.sponsorId}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => setSelectedSponsorId(sponsor.sponsorId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedSponsorId(sponsor.sponsorId)
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: isSelected
                    ? '2px solid var(--spectrum-global-color-blue-500)'
                    : '1px solid var(--spectrum-global-color-gray-300)',
                  backgroundColor: isSelected
                    ? 'var(--spectrum-global-color-blue-100)'
                    : 'var(--spectrum-global-color-gray-50)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  outline: 'none',
                }}
              >
                {imageData?.imageUrl && (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imageData.imageUrl}
                      alt={sponsor.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{sponsor.name}</span>
                  {(sponsor.externalUrl || sponsor.link) && (
                    <span style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      {sponsor.externalUrl || sponsor.link}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </Flex>
      )}
    </>
  )

  const renderCreateView = () => (
    <>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Flex alignItems="center" gap="size-100">
          <ActionButton onPress={handleBackToSelect} isQuiet aria-label="Back to search">
            <ArrowLeft />
          </ActionButton>
          <Text UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>New Partner</Text>
        </Flex>
      </Flex>

      <Flex direction="column" gap={FLEX_GAP.FIELD}>
        <Flex gap={FLEX_GAP.LARGE} alignItems="start">
          <View UNSAFE_style={{ textAlign: 'center' }}>
            <ImageUploader
              label=""
              imageUrl={createForm.imageUrl || ''}
              imageId={createForm.imageId || ''}
              imageKind="sponsor-logo"
              altText={createForm.name || 'Partner logo'}
              maxSizeMB={25}
              width={200}
              dropzoneTitle="Add partner image"
              dropzoneDimensions="584px x 306px, max 25MB"
              deferUpload={true}
              pendingFile={pendingFile || undefined}
              onFileSelected={(file) => setPendingFile(file)}
              onChange={(imageUrl, imageId) => {
                updateCreateField('imageUrl', imageUrl)
                updateCreateField('imageId', imageId)
              }}
              onRemove={() => {
                setPendingFile(null)
                updateCreateField('imageUrl', undefined)
                updateCreateField('imageId', undefined)
              }}
            />
          </View>

          <Flex direction="column" gap={FLEX_GAP.FIELD} flex={1}>
            <TextField
              label="Partner Name"
              value={createForm.name}
              onChange={(v) => updateCreateField('name', v)}
              isRequired
              width="100%"
            />
            <TextField
              label="Partner Website"
              value={createForm.website}
              onChange={(v) => updateCreateField('website', v)}
              placeholder="www.example.com"
              isRequired
              width="100%"
            />
          </Flex>
        </Flex>

        <Flex justifyContent="end" marginTop="size-200">
          <Button
            variant="accent"
            onPress={handleCreatePartner}
            isDisabled={!isCreateFormValid || isCreating}
          >
            {isCreating ? (
              <>
                <ProgressCircle size="S" isIndeterminate aria-label="Creating" />
                <Text>Creating...</Text>
              </>
            ) : (
              <Text>Add Partner</Text>
            )}
          </Button>
        </Flex>
      </Flex>
    </>
  )

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="L" isDismissable UNSAFE_style={{ maxHeight: '80vh' }}>
          <Content UNSAFE_style={{ overflow: 'auto' }}>
            {view === 'select' ? renderSelectView() : renderCreateView()}
          </Content>
        </Dialog>
      )}
    </DialogContainer>
  )
}
