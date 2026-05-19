/* 
* <license header>
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button, Dialog, DialogContainer, Heading, TextField, Text, SearchField, Content, ProgressCircle } from '@react-spectrum/s2'
import { style, iconStyle } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import OpenIn from '@react-spectrum/s2/icons/OpenIn'
import { SeriesSpeaker, SocialLinkFormData } from '../../types/domain'
import { speakerHasLocalization } from '../../utils/eventFormMappers'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { TYPOGRAPHY, COLORS, SURFACES } from '../../styles/designSystem'
import { detectSocialPlatform, isValidUrl, toApiSocialLink } from '../../utils/socialPlatformDetector'
import { cachedApi } from '../../services/api'
import { getSpeakerPayload } from '../../services/payloadBuilders'
import { uploadSpeakerSeriesImage } from '../../services/speakerImageUpload'
import { useToast } from '../../contexts'

interface SpeakerPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (speaker: SeriesSpeaker) => void
  seriesSpeakers: SeriesSpeaker[]
  selectedSpeakerIds: Set<string>
  seriesId: string
  locale: string
  onSpeakersRefresh: () => void
}

interface CreateFormState {
  firstName: string
  lastName: string
  title: string
  bio: string
  socialLinks: SocialLinkFormData[]
  imageUrl?: string
  imageId?: string
}

const initialCreateFormState: CreateFormState = {
  firstName: '',
  lastName: '',
  title: '',
  bio: '',
  socialLinks: [],
}

export const SpeakerPickerDialog: React.FC<SpeakerPickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  seriesSpeakers,
  selectedSpeakerIds,
  seriesId,
  locale,
  onSpeakersRefresh,
}) => {
  const toast = useToast()
  const [view, setView] = useState<'select' | 'create' | 'localize'>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [speakerToLocalize, setSpeakerToLocalize] = useState<SeriesSpeaker | null>(null)
  const [localizeForm, setLocalizeForm] = useState({ title: '', bio: '' })
  const [isSavingLocalization, setIsSavingLocalization] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setView('select')
      setSearchQuery('')
      setSelectedSpeakerId(null)
      setCreateForm(initialCreateFormState)
      setPendingFile(null)
      setIsCreating(false)
      setSpeakerToLocalize(null)
      setLocalizeForm({ title: '', bio: '' })
      setIsSavingLocalization(false)
    }
  }, [isOpen])

  const availableSpeakers = useMemo(() => {
    return seriesSpeakers.filter(s => !selectedSpeakerIds.has(s.speakerId))
  }, [seriesSpeakers, selectedSpeakerIds])

  const filteredSpeakers = useMemo(() => {
    if (!searchQuery.trim()) return availableSpeakers
    const q = searchQuery.toLowerCase().trim()
    return availableSpeakers.filter(s => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase()
      const title = (s.localizations?.[locale]?.title || s.title || '').toLowerCase()
      return fullName.includes(q) || title.includes(q)
    })
  }, [availableSpeakers, searchQuery, locale])

  const handleSelectConfirm = useCallback(() => {
    if (!selectedSpeakerId) return
    const speaker = seriesSpeakers.find(s => s.speakerId === selectedSpeakerId)
    if (!speaker) return
    if (!speakerHasLocalization(speaker, locale)) {
      setSpeakerToLocalize(speaker)
      setLocalizeForm({
        title: speaker.title ?? speaker.localizations?.[locale]?.title ?? '',
        bio: speaker.bio ?? speaker.localizations?.[locale]?.bio ?? '',
      })
      setView('localize')
    } else {
      onSelect(speaker)
      onClose()
    }
  }, [selectedSpeakerId, seriesSpeakers, locale, onSelect, onClose])

  const handleSwitchToCreate = useCallback(() => {
    setView('create')
    setCreateForm(initialCreateFormState)
    setPendingFile(null)
  }, [])

  const handleBackToSelect = useCallback(() => {
    setView('select')
  }, [])

  const handleBackFromLocalize = useCallback(() => {
    setView('select')
    setSpeakerToLocalize(null)
    setLocalizeForm({ title: '', bio: '' })
  }, [])

  const handleSaveAndAddLocalization = useCallback(async () => {
    if (!speakerToLocalize) return
    const title = localizeForm.title.trim()
    if (!title) return
    setIsSavingLocalization(true)
    try {
      const payload = await getSpeakerPayload(
        {
          speakerId: speakerToLocalize.speakerId,
          firstName: speakerToLocalize.firstName,
          lastName: speakerToLocalize.lastName,
          title,
          bio: localizeForm.bio.trim() || undefined,
          socialLinks: speakerToLocalize.socialLinks,
          modificationTime: speakerToLocalize.modificationTime,
        },
        locale,
        seriesId
      )
      const result = await cachedApi.updateSpeaker(payload as any, seriesId)
      if (result && 'error' in result) {
        toast.error('Failed to save speaker localization')
        return
      }
      if (result) {
        const updated = result.speaker ?? result
        const mergedSpeaker: SeriesSpeaker = {
          ...speakerToLocalize,
          localizations: {
            ...speakerToLocalize.localizations,
            [locale]: { title, bio: localizeForm.bio.trim() || undefined },
          },
          modificationTime: updated.modificationTime ?? speakerToLocalize.modificationTime,
        }
        onSpeakersRefresh()
        onSelect(mergedSpeaker)
        onClose()
      }
    } catch (err) {
      console.error('Failed to save speaker localization:', err)
      toast.error('Failed to save speaker localization')
    } finally {
      setIsSavingLocalization(false)
    }
  }, [speakerToLocalize, localizeForm, locale, seriesId, onSpeakersRefresh, onSelect, onClose, toast])

  const updateCreateField = useCallback(<K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleAddSocialLink = useCallback(() => {
    setCreateForm(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { url: '' }],
    }))
  }, [])

  const handleRemoveSocialLink = useCallback((index: number) => {
    setCreateForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }, [])

  const handleUpdateSocialLink = useCallback((index: number, url: string) => {
    setCreateForm(prev => {
      const updated = [...prev.socialLinks]
      const platform = detectSocialPlatform(url)
      updated[index] = { url, platform: platform?.name }
      return { ...prev, socialLinks: updated }
    })
  }, [])

  const handleCreateSpeaker = useCallback(async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) return

    setIsCreating(true)
    try {
      const speakerData: Record<string, any> = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        socialLinks: createForm.socialLinks
          .filter(l => l.url.trim())
          .map(l => toApiSocialLink(l)),
      }

      const localizableFields: Record<string, any> = {}
      if (createForm.title.trim()) localizableFields.title = createForm.title.trim()
      if (createForm.bio.trim()) localizableFields.bio = createForm.bio.trim()

      if (Object.keys(localizableFields).length > 0) {
        speakerData.localizations = { [locale]: localizableFields }
      }

      const response = await cachedApi.createSpeaker(speakerData, seriesId)

      if (response && !('error' in response)) {
        const savedSpeaker = response.speaker || response
        const speakerId = savedSpeaker.speakerId

        let photo: SeriesSpeaker['photo'] | undefined
        if (pendingFile) {
          const altText = `${createForm.firstName} ${createForm.lastName}`
          const uploaded = await uploadSpeakerSeriesImage(pendingFile, seriesId, speakerId, altText)
          if (uploaded) {
            photo = { imageUrl: uploaded.imageUrl, imageId: uploaded.imageId }
          }
        }

        onSpeakersRefresh()

        const newSpeaker: SeriesSpeaker = {
          speakerId,
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          title: createForm.title.trim() || undefined,
          bio: createForm.bio.trim() || undefined,
          socialLinks: speakerData.socialLinks,
          photo,
          localizations: speakerData.localizations,
          modificationTime: savedSpeaker.modificationTime,
          creationTime: savedSpeaker.creationTime,
        }

        onSelect(newSpeaker)
        onClose()
      } else {
        console.error('Failed to create speaker:', response)
      }
    } catch (err) {
      console.error('Error creating speaker:', err)
    } finally {
      setIsCreating(false)
    }
  }, [createForm, pendingFile, seriesId, locale, onSelect, onClose, onSpeakersRefresh])

  const isCreateFormValid = createForm.firstName.trim() && createForm.lastName.trim()

  const getLocalizedTitle = (speaker: SeriesSpeaker): string => {
    return speaker.localizations?.[locale]?.title || speaker.title || ''
  }

  const renderSelectContent = () => (
    <>
      <div className={style({display: 'flex', justifyContent: 'end', gap: 8, marginBottom: 16})}>
        <Button variant="secondary" onPress={handleSwitchToCreate} aria-label="Create new speaker">
          <Add />
          <Text>New Speaker</Text>
        </Button>
        <Button variant="accent" onPress={handleSelectConfirm} isDisabled={!selectedSpeakerId}>
          <Text>Select Speaker</Text>
        </Button>
      </div>
      <SearchField
        label="Search speakers"
        value={searchQuery}
        onChange={setSearchQuery}
        styles={style({ width: '[100%]', marginBottom: 24 })}
      />

      {filteredSpeakers.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
            {searchQuery.trim()
              ? 'No speakers match your search. Try a different query or create a new speaker.'
              : 'No speakers available. Create a new speaker to get started.'}
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
          {filteredSpeakers.map(speaker => {
            const isSelected = selectedSpeakerId === speaker.speakerId
            const title = getLocalizedTitle(speaker)
            const missingLocalization = !speakerHasLocalization(speaker, locale)

            return (
              <div
                key={speaker.speakerId}
                onClick={() => setSelectedSpeakerId(speaker.speakerId)}
                role="option"
                aria-selected={isSelected}
                aria-label={missingLocalization ? `Missing title for ${locale}` : undefined}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedSpeakerId(speaker.speakerId)
                  }
                }}
                style={{
                  padding: '16px 12px',
                  border: isSelected
                    ? `2px solid ${SURFACES.SELECTED_RING}`
                    : `1px solid ${SURFACES.BORDER}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? SURFACES.SELECTED_FILL
                    : SURFACES.CANVAS,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  outline: 'none',
                  position: 'relative',
                }}
              >
                {speaker.photo?.imageUrl ? (
                  <img
                    src={speaker.photo.imageUrl}
                    alt={`${speaker.firstName} ${speaker.lastName}`}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: `1px solid ${SURFACES.BORDER}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: SURFACES.CHROME,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.GRAY_600,
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}
                  >
                    {speaker.firstName?.[0] || ''}{speaker.lastName?.[0] || ''}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '18px' }}>
                    {speaker.firstName} {speaker.lastName}
                  </div>
                  {missingLocalization ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '2px',
                        fontSize: '11px',
                        color: COLORS.RED_600,
                        lineHeight: '16px',
                      }}
                    >
                      <AlertTriangle styles={iconStyle({ color: 'negative'})} aria-hidden />
                      <span>Missing title for {locale}</span>
                    </div>
                  ) : title ? (
                    <div
                      style={{
                        fontSize: '11px',
                        color: COLORS.GRAY_600,
                        lineHeight: '16px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '140px',
                      }}
                    >
                      {title}
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

  const renderLocalizeContent = () => {
    if (!speakerToLocalize) return null
    return (
      <>
        <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16})}>
          <Button variant="secondary" size="S" onPress={handleBackFromLocalize} aria-label="Back to search">
            <Text>Back</Text>
          </Button>
          <Button
            variant="accent"
            onPress={handleSaveAndAddLocalization}
            isDisabled={!localizeForm.title.trim() || isSavingLocalization}
          >
            {isSavingLocalization ? (
              <>
                <ProgressCircle size="S" isIndeterminate aria-label="Saving" />
                <Text>Saving...</Text>
              </>
            ) : (
              <Text>Save &amp; Add Speaker</Text>
            )}
          </Button>
        </div>
        {!localizeForm.title.trim() && (
          <div
            role="alert"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              background: 'var(--color-background-danger)',
              border: '1px solid var(--color-border-danger)',
              borderRadius: 'var(--border-radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <svg
              style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2, fill: 'var(--color-text-danger)' }}
              viewBox="0 0 18 17"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M8.564 1.289L.2 16.256A.5.5 0 0 0 .636 17h16.728a.5.5 0 0 0 .436-.744L9.436 1.289a.5.5 0 0 0-.872 0zM10 14.75a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25zm0-3a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-6a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25z" />
            </svg>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-danger)' }}>
              This speaker does not have a localized title for <strong style={{ fontWeight: 500 }}>{locale}</strong>. Add a title below (required). Bio is optional.
            </span>
          </div>
        )}
        <form>
          <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
            <TextField
              label="Title / Role"
              value={localizeForm.title}
              onChange={(v) => setLocalizeForm(prev => ({ ...prev, title: v }))}
              placeholder="e.g., Senior Product Designer"
              isRequired
              styles={style({ width: '[100%]' })}
            />
            <RichTextEditor
              label="Bio (Optional)"
              value={localizeForm.bio}
              onChange={(v) => setLocalizeForm(prev => ({ ...prev, bio: v }))}
              height="150px"
            />
            {!localizeForm.bio.trim() && (
              <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600, fontStyle: 'italic' }}>
                No bio has been added for this locale.
              </Text>
            )}
          </div>
        </form>
      </>
    )
  }

  const renderCreateContent = () => (
    <>
    <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16})}>
      <Button variant="secondary" size="S" onPress={handleBackToSelect} aria-label="Back to search">
        <Text>Back</Text>
      </Button>
    </div>
    <form>
        <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
          <div className={style({display: 'flex', gap: 16, alignItems: 'end'})}>
            {/* Avatar placeholder */}
            <div>
              <div style={{ width: '100%' }}>
                <ImageUploader
                  label="Photo"
                  imageUrl={createForm.imageUrl}
                  imageId={createForm.imageId}
                  imageKind="speaker-photo"
                  altText={`${createForm.firstName} ${createForm.lastName}`}
                  maxSizeMB={25}
                  dropzoneTitle="Add Photo"
                  dropzoneDimensions=""
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
            </div>
          </div>

          <div className={style({display: 'flex', gap: 16})}>
            <TextField
              label="First Name"
              value={createForm.firstName}
              onChange={(v) => updateCreateField('firstName', v)}
              isRequired
              styles={style({ width: '[100%]' })}
            />
            <TextField
              label="Last Name"
              value={createForm.lastName}
              onChange={(v) => updateCreateField('lastName', v)}
              isRequired
              styles={style({ width: '[100%]' })}
            />
          </div>

          <TextField
            label="Title / Role"
            value={createForm.title}
            onChange={(v) => updateCreateField('title', v)}
            placeholder="e.g., Senior Product Designer"
            styles={style({ width: '[100%]' })}
          />

          <RichTextEditor
            label="Bio (Optional)"
            value={createForm.bio}
            onChange={(v) => updateCreateField('bio', v)}
            height="150px"
          />

          {/* Social Links */}
          <div>
            <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8})}>
              <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Social Media Links</Text>
              <Button variant="secondary" size="S" onPress={handleAddSocialLink}>
                <Add />
                <Text>Add Link</Text>
              </Button>
            </div>

            {createForm.socialLinks.length === 0 ? (
              <Text UNSAFE_style={{ fontSize: '14px', color: COLORS.GRAY_600, fontStyle: 'italic' }}>
                No social media links added yet.
              </Text>
            ) : (
              <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
                {createForm.socialLinks.map((socialLink, index) => {
                  const detectedPlatform = detectSocialPlatform(socialLink.url)
                  const valid = isValidUrl(socialLink.url)

                  return (
                    <div key={index} className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
                      <div
                        style={{
                          minWidth: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: detectedPlatform
                            ? detectedPlatform.color
                            : COLORS.GRAY_500,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                        }}
                      >
                        {detectedPlatform ? detectedPlatform.icon : <OpenIn />}
                      </div>

                      <TextField
                        placeholder="https://..."
                        value={socialLink.url}
                        onChange={(value) => handleUpdateSocialLink(index, value)}
                        styles={style({ width: '[100%]' })}
                        isInvalid={!!(socialLink.url && !valid)}
                      />

                      <Button variant="secondary" size="S" onPress={() => handleRemoveSocialLink(index)} aria-label="Remove link">
                        <RemoveCircle />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </form>
      <div className={style({display: 'flex', justifyContent: 'end', alignItems: 'center', marginTop: 16})}>
        <Button
          variant="accent"
          onPress={handleCreateSpeaker}
          isDisabled={!isCreateFormValid || isCreating}
        >
          {isCreating ? (
            <>
              <ProgressCircle size="S" isIndeterminate aria-label="Creating" />
              <Text>Creating...</Text>
            </>
          ) : (
            <Text>Add Speaker</Text>
          )}
        </Button>
      </div>
    </>
  )

  const speakerDisplayName = speakerToLocalize
    ? `${speakerToLocalize.firstName} ${speakerToLocalize.lastName}`
    : ''

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog data-testid="speaker-picker-dialog" size="L" isDismissible>
          {() => (
            <>
              <Heading slot="title">
                {view === 'select' ? 'Select Speaker'
                  : view === 'create' ? 'New Speaker'
                  : `Add ${locale} content for ${speakerDisplayName}`}
              </Heading>
              <Content>
                <div style={{ overflow: 'auto', maxHeight: '60vh' }}>
                  {view === 'select'
                    ? renderSelectContent()
                    : view === 'localize'
                      ? renderLocalizeContent()
                      : renderCreateContent()}
                </div>
              </Content>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  )
}
