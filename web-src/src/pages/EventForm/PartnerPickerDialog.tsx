/* 
* <license header>
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ProgressCircle,
} from '@adobe/react-spectrum'
import { Button, Dialog, DialogContainer, TextField, Text, SearchField, Content, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import { SeriesSponsor, SponsorData } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
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
      fetchSeriesSponsors(seriesId)
        .then((sponsors) => setLocalSponsors(sponsors))
        .catch((err) => {
          console.error('Failed to fetch series sponsors:', err)
          setLocalSponsors([])
        })
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

  const renderSelectContent = () => (
    <>
      <div className={style({display: 'flex', justifyContent: 'end', gap: 8, marginBottom: 16, alignItems: 'center'})}>
        <Button variant="secondary" onPress={handleSwitchToCreate} aria-label="Create new partner">
          <Add />
          <Text>New Partner</Text>
        </Button>
        <Button variant="accent" onPress={handleSelectConfirm} isDisabled={!selectedSponsorId}>
          <Text>Select Partner</Text>
        </Button>
      </div>
      <SearchField
        label="Search partners"
        value={searchQuery}
        onChange={setSearchQuery}
        styles={style({ width: '[100%]', marginBottom: 24 })}
      />

      {filteredSponsors.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Text>No partners available. Create a new one using the + button above.</Text>
        </div>
      ) : (
        <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
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
                    ? '2px solid #1473E6'
                    : '1px solid #D3D3D3',
                  backgroundColor: isSelected
                    ? '#E5F0FF'
                    : '#FFFFFF',
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
                    <span style={{ fontSize: '12px', color: '#6E6E6E' }}>
                      {sponsor.externalUrl || sponsor.link}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const renderCreateContent = () => (
    <>
      <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16})}>
        <Button variant="secondary" onPress={handleBackToSelect} aria-label="Back to search">
          <Text>Back</Text>
        </Button>
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
      </div>
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        <div className={style({display: 'flex', gap: 32, alignItems: 'start'})}>
          <div style={{ textAlign: 'center' }}>
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
          </div>

          <div className={style({display: 'flex', flexDirection: 'column', gap: 16, flexGrow: 1})}>
            <TextField
              label="Partner Name"
              value={createForm.name}
              onChange={(v) => updateCreateField('name', v)}
              isRequired
              styles={style({ width: '[100%]' })}
            />
            <TextField
              label="Partner Website"
              value={createForm.website}
              onChange={(v) => updateCreateField('website', v)}
              placeholder="www.example.com"
              isRequired
              styles={style({ width: '[100%]' })}
            />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog isDismissible size="L">
          {() => (
            <>
              <Heading slot="title">
                {view === 'select' ? 'Select Partner' : 'New Partner'}
              </Heading>
              <Content>
                <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
                  {view === 'select' ? renderSelectContent() : renderCreateContent()}
                </div>
              </Content>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  )
}
