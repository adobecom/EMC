/* 
* <license header>
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  TextField,
  Button,
  View,
  Flex,
  Text,
  ActionButton,
  ProgressCircle,
  SearchField,
  Form,
  TooltipTrigger,
  Tooltip,
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import Alert from '@spectrum-icons/workflow/Alert'
import ArrowLeft from '@spectrum-icons/workflow/ArrowLeft'
import Delete from '@spectrum-icons/workflow/Delete'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { SeriesSpeaker, SocialLinkFormData } from '../../types/domain'
import { speakerHasLocalization } from '../../utils/eventFormMappers'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { TYPOGRAPHY, FLEX_GAP, COLORS } from '../../styles/designSystem'
import { detectSocialPlatform, isValidUrl, toApiSocialLink } from '../../utils/socialPlatformDetector'
import { cachedApi, apiService } from '../../services/api'
import { getSpeakerPayload } from '../../services/payloadBuilders'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'

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
      if (result && !('error' in result)) {
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
    } finally {
      setIsSavingLocalization(false)
    }
  }, [speakerToLocalize, localizeForm, locale, seriesId, onSpeakersRefresh, onSelect, onClose])

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

  const uploadSpeakerImage = async (
    file: File,
    speakerId: string,
    altText: string
  ): Promise<{ imageUrl: string; imageId: string } | null> => {
    try {
      const token = apiService.getAuthTokenForExternalUse()
      if (!token) throw new Error('No authentication token available')

      const env = getCurrentEnvironment()
      const host = getApiHost('esp', env)
      const uploadUrl = `${host}/v1/series/${seriesId}/speakers/${speakerId}/images`

      const tracker: UploadTracker = { progress: 0 }
      const config = {
        targetUrl: uploadUrl,
        altText,
        type: 'speaker-photo',
      }

      const result = await uploadImage(file, config, token, tracker)
      const imageData = result.image || result

      if (imageData.imageUrl && imageData.imageId) {
        return { imageUrl: imageData.imageUrl, imageId: imageData.imageId }
      }
      return null
    } catch (err) {
      console.error('Failed to upload speaker image:', err)
      return null
    }
  }

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
          const uploaded = await uploadSpeakerImage(pendingFile, speakerId, altText)
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

  const renderSelectView = () => (
    <>
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          Select Speaker
        </Heading>
        <Flex gap="size-100" alignItems="center">
          <ActionButton onPress={handleSwitchToCreate} aria-label="Create new speaker">
            <Add />
          </ActionButton>
          <Button
            variant="accent"
            onPress={handleSelectConfirm}
            isDisabled={!selectedSpeakerId}
          >
            <Text>Select</Text>
          </Button>
        </Flex>
      </Flex>

      <SearchField
        label="Search speakers"
        value={searchQuery}
        onChange={setSearchQuery}
        width="100%"
        marginBottom="size-300"
      />

      {filteredSpeakers.length === 0 ? (
        <View padding="size-400" UNSAFE_style={{ textAlign: 'center' }}>
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {searchQuery.trim()
              ? 'No speakers match your search. Try a different query or create a new speaker.'
              : 'No speakers available. Create a new speaker to get started.'}
          </Text>
        </View>
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
                    ? '2px solid var(--spectrum-global-color-blue-500)'
                    : '1px solid var(--spectrum-global-color-gray-300)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'var(--spectrum-global-color-blue-100)'
                    : 'var(--spectrum-global-color-gray-50)',
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
                {missingLocalization && (
                  <TooltipTrigger delay={0}>
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Alert
                        size="S"
                        UNSAFE_style={{ color: COLORS.ADOBE_RED }}
                        aria-label={`Missing title for ${locale}`}
                      />
                    </span>
                    <Tooltip variant="negative">
                      This speaker is missing a localized title for {locale}. Add it in the
                      Speakers dashboard or when adding the speaker to avoid display issues.
                    </Tooltip>
                  </TooltipTrigger>
                )}
                {speaker.photo?.imageUrl ? (
                  <img
                    src={speaker.photo.imageUrl}
                    alt={`${speaker.firstName} ${speaker.lastName}`}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--spectrum-global-color-gray-300)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--spectrum-global-color-gray-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--spectrum-global-color-gray-600)',
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
                  {title && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--spectrum-global-color-gray-600)',
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
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const renderLocalizeView = () => {
    if (!speakerToLocalize) return null
    const displayName = `${speakerToLocalize.firstName} ${speakerToLocalize.lastName}`
    return (
      <>
        <Flex alignItems="center" gap="size-100" marginBottom="size-200">
          <ActionButton onPress={handleBackFromLocalize} isQuiet aria-label="Back to search">
            <ArrowLeft />
          </ActionButton>
          <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            Add {locale} content for {displayName}
          </Heading>
        </Flex>
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
        <Form>
          <Flex direction="column" gap={FLEX_GAP.SECTION}>
            <TextField
              label="Title / Role"
              value={localizeForm.title}
              onChange={(v) => setLocalizeForm(prev => ({ ...prev, title: v }))}
              placeholder="e.g., Senior Product Designer"
              isRequired
              width="100%"
            />
            <RichTextEditor
              label="Bio (Optional)"
              value={localizeForm.bio}
              onChange={(v) => setLocalizeForm(prev => ({ ...prev, bio: v }))}
              height="150px"
            />
            {!localizeForm.bio.trim() && (
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                No bio has been added for this locale.
              </Text>
            )}
            <Flex gap="size-150" justifyContent="end" marginTop="size-200">
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
            </Flex>
          </Flex>
        </Form>
      </>
    )
  }

  const renderCreateView = () => (
    <>
      <Flex alignItems="center" gap="size-100" marginBottom="size-200">
        <ActionButton onPress={handleBackToSelect} isQuiet aria-label="Back to search">
          <ArrowLeft />
        </ActionButton>
        <Heading level={3} UNSAFE_style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
          New Speaker
        </Heading>
      </Flex>

      <Form>
        <Flex direction="column" gap={FLEX_GAP.SECTION}>
          <Flex direction="row" gap={FLEX_GAP.FIELD} alignItems="end">
            {/* Avatar placeholder */}
            <View>
              <View width="100%">
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
              </View>
            </View>
          </Flex>

          <Flex direction="row" gap={FLEX_GAP.FIELD}>
            <TextField
              label="First Name"
              value={createForm.firstName}
              onChange={(v) => updateCreateField('firstName', v)}
              isRequired
              width="100%"
            />
            <TextField
              label="Last Name"
              value={createForm.lastName}
              onChange={(v) => updateCreateField('lastName', v)}
              isRequired
              width="100%"
            />
          </Flex>

          <TextField
            label="Title / Role"
            value={createForm.title}
            onChange={(v) => updateCreateField('title', v)}
            placeholder="e.g., Senior Product Designer"
            width="100%"
          />

          <RichTextEditor
            label="Bio (Optional)"
            value={createForm.bio}
            onChange={(v) => updateCreateField('bio', v)}
            height="150px"
          />

          {/* Social Links */}
          <View>
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
              <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Social Media Links</Text>
              <ActionButton onPress={handleAddSocialLink} isQuiet>
                <Add />
                <Text>Add Link</Text>
              </ActionButton>
            </Flex>

            {createForm.socialLinks.length === 0 ? (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                No social media links added yet.
              </Text>
            ) : (
              <Flex direction="column" gap="size-100">
                {createForm.socialLinks.map((socialLink, index) => {
                  const detectedPlatform = detectSocialPlatform(socialLink.url)
                  const valid = isValidUrl(socialLink.url)

                  return (
                    <Flex key={index} gap="size-100" alignItems="center">
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
                          fontWeight: 'bold',
                        }}
                      >
                        {detectedPlatform ? detectedPlatform.icon : <LinkOut />}
                      </View>

                      <TextField
                        placeholder="https://..."
                        value={socialLink.url}
                        onChange={(value) => handleUpdateSocialLink(index, value)}
                        width="100%"
                        validationState={socialLink.url && !valid ? 'invalid' : undefined}
                      />

                      <ActionButton onPress={() => handleRemoveSocialLink(index)} isQuiet>
                        <Delete />
                      </ActionButton>
                    </Flex>
                  )
                })}
              </Flex>
            )}
          </View>

          <Flex justifyContent="end" marginTop="size-200">
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
          </Flex>
        </Flex>
      </Form>
    </>
  )

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="L" isDismissable UNSAFE_style={{ maxHeight: '80vh' }}>
          <Content UNSAFE_style={{ overflow: 'auto' }}>
            {view === 'select'
              ? renderSelectView()
              : view === 'localize'
                ? renderLocalizeView()
                : renderCreateView()}
          </Content>
        </Dialog>
      )}
    </DialogContainer>
  )
}
