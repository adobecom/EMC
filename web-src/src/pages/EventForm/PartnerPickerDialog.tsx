/* 
* <license header>
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button, Dialog, DialogContainer, TextField, Text, SearchField, Content, Heading, ProgressCircle } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import { SeriesSponsor, SponsorData } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
import { apiService, cachedApi } from '../../services/api'
import { extractImageFromUploadResponse, uploadImage, UploadTracker } from '../../services/requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'
import { getLocalizedValue } from '../../utils/eventFormMappers'

interface PartnerPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (partner: SponsorData) => void
  seriesSponsors: SeriesSponsor[]
  selectedSponsorIds: Set<string>
  seriesId: string
  locale: string
  onSponsorsRefresh: () => void
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
  locale,
  onSponsorsRefresh,
}) => {
  const [view, setView] = useState<'select' | 'create'>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)

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

  const availableSponsors = useMemo(() => {
    return seriesSponsors.filter(s => !selectedSponsorIds.has(s.sponsorId))
  }, [seriesSponsors, selectedSponsorIds])

  const getLocalizedName = useCallback(
    (s: SeriesSponsor) => getLocalizedValue(s, 'name', locale) || s.name || '',
    [locale]
  )

  const getLocalizedLink = useCallback(
    (s: SeriesSponsor) =>
      getLocalizedValue(s, 'link', locale) || s.externalUrl || s.link || '',
    [locale]
  )

  const filteredSponsors = useMemo(() => {
    if (!searchQuery.trim()) return availableSponsors
    const q = searchQuery.toLowerCase().trim()
    return availableSponsors.filter(s => {
      const name = getLocalizedName(s).toLowerCase()
      const link = getLocalizedLink(s).toLowerCase()
      return name.includes(q) || link.includes(q)
    })
  }, [availableSponsors, searchQuery, getLocalizedName, getLocalizedLink])

  const handleSelectConfirm = useCallback(() => {
    if (!selectedSponsorId) return
    const sponsor = seriesSponsors.find(s => s.sponsorId === selectedSponsorId)
    if (!sponsor) return
    const imageData = sponsor.image || sponsor.logo
    const partnerName = getLocalizedName(sponsor)
    const partnerUrl = getLocalizedLink(sponsor)
    const partnerData: SponsorData = {
      id: `partner-${Date.now()}`,
      sponsorId: sponsor.sponsorId,
      partnerName,
      partnerUrl,
      imageUrl: imageData?.imageUrl,
      imageId: imageData?.imageId,
      isSaved: true,
      isFromSeries: true,
      modificationTime: sponsor.modificationTime,
      localizations: sponsor.localizations,
    }
    onSelect(partnerData)
    onClose()
  }, [selectedSponsorId, seriesSponsors, getLocalizedName, getLocalizedLink, onSelect, onClose])

  const updateCreateField = useCallback((field: keyof CreateFormState, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const isCreateFormValid = createForm.name.trim() !== '' && createForm.website.trim() !== ''

  const uploadSponsorImage = useCallback(
    async (
      file: File,
      sponsorId: string,
      altText: string
    ): Promise<{ imageUrl: string; imageId: string } | null> => {
      try {
        const token = apiService.getAuthTokenForExternalUse()
        if (!token) throw new Error('No authentication token available')

        const env = getCurrentEnvironment()
        const host = getApiHost('esp', env)
        const uploadUrl = `${host}/v1/series/${seriesId}/sponsors/${sponsorId}/images`

        const tracker: UploadTracker = { progress: 0 }
        const config = {
          targetUrl: uploadUrl,
          altText,
          type: 'sponsor-image',
        }

        const result = await uploadImage(file, config, token, tracker)
        return extractImageFromUploadResponse(result)
      } catch (err) {
        console.error('Failed to upload sponsor image:', err)
        return null
      }
    },
    [seriesId]
  )

  const handleCreatePartner = useCallback(async () => {
    if (!isCreateFormValid || !seriesId) return

    setIsCreating(true)
    try {
      let partnerUrl = createForm.website.trim()
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

      const response = await cachedApi.createSponsor(sponsorPayload, seriesId, locale)

      if (response && !('error' in response)) {
        const savedSponsor = response.sponsor || response
        const sponsorId = savedSponsor.sponsorId

        let photo: { imageUrl: string; imageId: string } | undefined
        if (pendingFile && sponsorId) {
          const altText = createForm.name.trim() || 'Partner logo'
          const uploaded = await uploadSponsorImage(pendingFile, sponsorId, altText)
          if (uploaded) {
            photo = uploaded
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
          ...(photo ? { imageUrl: photo.imageUrl, imageId: photo.imageId } : {}),
        }

        onSelect(newPartner)
        onClose()
      } else {
        console.error('Failed to create partner:', response)
      }
    } catch (error) {
      console.error('Failed to create partner:', error)
    } finally {
      setIsCreating(false)
    }
  }, [
    createForm,
    pendingFile,
    seriesId,
    locale,
    isCreateFormValid,
    onSelect,
    onClose,
    onSponsorsRefresh,
    uploadSponsorImage,
  ])

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
      <div className={style({display: 'flex', justifyContent: 'end', gap: 8, marginBottom: 16})}>
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
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Text UNSAFE_style={{ color: '#6E6E6E' }}>
            {searchQuery.trim()
              ? 'No partners match your search. Try a different query or create a new partner.'
              : 'No partners available. Create a new partner to get started.'}
          </Text>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredSponsors.map(sponsor => {
            const imageData = sponsor.image || sponsor.logo
            const isSelected = selectedSponsorId === sponsor.sponsorId
            const displayName = getLocalizedName(sponsor)
            const displayLink = getLocalizedLink(sponsor)
            const initials = displayName
              .split(/\s+/)
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?'

            return (
              <div
                key={sponsor.sponsorId}
                onClick={() => setSelectedSponsorId(sponsor.sponsorId)}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedSponsorId(sponsor.sponsorId)
                  }
                }}
                style={{
                  padding: '16px 12px',
                  border: isSelected ? '2px solid #1473E6' : '1px solid #D3D3D3',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#E5F0FF' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  outline: 'none',
                }}
              >
                {imageData?.imageUrl ? (
                  <img
                    src={imageData.imageUrl}
                    alt={displayName}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      border: '1px solid #D3D3D3',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      backgroundColor: '#D3D3D3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6E6E6E',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '18px' }}>{displayName}</div>
                  {displayLink ? (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#6E6E6E',
                        lineHeight: '16px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '140px',
                      }}
                    >
                      {displayLink}
                    </div>
                  ) : null}
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
        <Button variant="secondary" size="S" onPress={handleBackToSelect} aria-label="Back to search">
          <Text>Back</Text>
        </Button>
      </div>
      <form>
        <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
          <div className={style({display: 'flex', gap: 32, alignItems: 'start'})}>
            <div style={{ textAlign: 'center' }}>
              <ImageUploader
                label=""
                imageUrl={createForm.imageUrl || ''}
                imageId={createForm.imageId || ''}
                imageKind="sponsor-image"
                altText={createForm.name || 'Partner logo'}
                maxSizeMB={25}
                width={280}
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
      </form>
      <div className={style({display: 'flex', justifyContent: 'end', alignItems: 'center', marginTop: 16})}>
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
    </>
  )

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog data-testid="partner-picker-dialog" size="L" isDismissible>
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
