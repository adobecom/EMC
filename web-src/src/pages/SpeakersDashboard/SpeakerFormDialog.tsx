/* 
* <license header>
*/

/**
 * SpeakerFormDialog - Modal dialog for creating/editing speakers
 *
 * Deferred profile image: same contract as EventForm `PartnerDialog` / `PartnerPickerDialog` —
 * the API payload is built without any `File`; `pendingFile` is passed as a separate argument
 * to `onSubmit`, then the parent saves the speaker and uploads via `uploadSpeakerSeriesImage`.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ActionButton,
  Text,
  Button,
  ButtonGroup,
  TextField,
  Dialog,
  DialogTrigger,
  Content,
  Heading,
  Form,
  ProgressCircle,
  Checkbox,
  Picker,
  PickerItem,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import OpenIn from '@react-spectrum/s2/icons/OpenIn'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { SocialLink, SocialLinkFormData } from '../../types/domain'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { detectSocialPlatform, isValidUrl, toApiSocialLink, fromApiSocialLink } from '../../utils/socialPlatformDetector'
import { getProfileAttr } from '../../utils/dataFilters'
import { TYPOGRAPHY } from '../../styles/designSystem'
import {
  DEFAULT_LOCALE,
  SUPPORTED_SPEAKER_LOCALES,
  SPEAKER_LOCALE_LABELS,
} from '../../config/localeMapping'
import type { SpeakerDashboardLocalizationDraft } from '../../services/payloadBuilders'

/** Mirrors `PartnerDialogSaveOptions` shape: serializable payload first, `File` second, options last */
export interface SpeakerFormSaveOptions {
  cascadeToEvents?: boolean
}

export interface SpeakerFormSubmitData {
  firstName: string
  lastName: string
  socialLinks: SocialLink[]
  localizationDrafts: Record<string, SpeakerDashboardLocalizationDraft>
  removedImageId?: string
  /** PUT replace when updating an existing profile photo (see PartnerDialog) */
  replaceImageId?: string
}

interface SpeakerFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    data: SpeakerFormSubmitData,
    pendingFile?: File,
    options?: SpeakerFormSaveOptions
  ) => Promise<void>
  speaker: SpeakerDashboardItem | null
  seriesId: string
  isSubmitting: boolean
  cascadeToEvents?: boolean
}

interface FormState {
  firstName: string
  lastName: string
  socialLinks: SocialLinkFormData[]
  imageUrl?: string
  imageId?: string
}

const initialFormState: FormState = {
  firstName: '',
  lastName: '',
  socialLinks: [],
}

function emptyLocalizationDrafts(): Record<string, SpeakerDashboardLocalizationDraft> {
  return Object.fromEntries(
    SUPPORTED_SPEAKER_LOCALES.map((loc) => [loc, { title: '', bio: '' }])
  ) as Record<string, SpeakerDashboardLocalizationDraft>
}

function localizationDraftsFromSpeaker(
  speaker: SpeakerDashboardItem
): Record<string, SpeakerDashboardLocalizationDraft> {
  const row = speaker as unknown as Record<string, unknown>
  const base = emptyLocalizationDrafts()
  for (const loc of SUPPORTED_SPEAKER_LOCALES) {
    const title = getProfileAttr(row, 'title', loc)
    const bio = getProfileAttr(row, 'bio', loc)
    base[loc] = {
      title: typeof title === 'string' ? title : '',
      bio: typeof bio === 'string' ? bio : '',
    }
  }
  return base
}

export const SpeakerFormDialog: React.FC<SpeakerFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  speaker,
  seriesId: _seriesId,
  isSubmitting,
  cascadeToEvents,
}) => {
  void _seriesId
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [localizationDrafts, setLocalizationDrafts] = useState<
    Record<string, SpeakerDashboardLocalizationDraft>
  >(emptyLocalizationDrafts)
  const [selectedLocale, setSelectedLocale] = useState<string>(DEFAULT_LOCALE)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [removedImageId, setRemovedImageId] = useState<string | undefined>(undefined)
  const [shouldCascade, setShouldCascade] = useState(cascadeToEvents ?? false)
  const imageIdWhenDialogOpenedRef = useRef<string | undefined>(undefined)

  const isEditing = !!speaker

  const activeLocaleDraft = useMemo(() => {
    return (
      localizationDrafts[selectedLocale] ?? { title: '', bio: '' }
    )
  }, [localizationDrafts, selectedLocale])

  useEffect(() => {
    if (isOpen && speaker) {
      setFormState({
        firstName: speaker.firstName || '',
        lastName: speaker.lastName || '',
        socialLinks: speaker.socialLinks?.map((link) => fromApiSocialLink(link)) || [],
        imageUrl: speaker.photo?.imageUrl,
        imageId: speaker.photo?.imageId,
      })
      setLocalizationDrafts(localizationDraftsFromSpeaker(speaker))
      setSelectedLocale(DEFAULT_LOCALE)
      setShouldCascade(cascadeToEvents ?? false)
      setRemovedImageId(undefined)
      setPendingFile(null)
      imageIdWhenDialogOpenedRef.current = speaker.photo?.imageId
    } else if (isOpen) {
      setFormState(initialFormState)
      setLocalizationDrafts(emptyLocalizationDrafts())
      setSelectedLocale(DEFAULT_LOCALE)
      setPendingFile(null)
      setRemovedImageId(undefined)
      setShouldCascade(false)
      imageIdWhenDialogOpenedRef.current = undefined
    }
  }, [isOpen, speaker, cascadeToEvents])

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateActiveLocaleTitle = useCallback(
    (value: string) => {
      setLocalizationDrafts((prev) => ({
        ...prev,
        [selectedLocale]: {
          ...(prev[selectedLocale] ?? { title: '', bio: '' }),
          title: value,
        },
      }))
    },
    [selectedLocale]
  )

  const updateActiveLocaleBio = useCallback(
    (value: string) => {
      setLocalizationDrafts((prev) => ({
        ...prev,
        [selectedLocale]: {
          ...(prev[selectedLocale] ?? { title: '', bio: '' }),
          bio: value,
        },
      }))
    },
    [selectedLocale]
  )

  const handleLocaleChange = useCallback((key: React.Key | null) => {
    if (key != null) {
      setSelectedLocale(String(key))
    }
  }, [])

  const handleAddSocialLink = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { url: '' }],
    }))
  }, [])

  const handleRemoveSocialLink = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }))
  }, [])

  const handleUpdateSocialLink = useCallback((index: number, url: string) => {
    setFormState((prev) => {
      const updated = [...prev.socialLinks]
      const platform = detectSocialPlatform(url)
      updated[index] = { url, platform: platform?.name }
      return { ...prev, socialLinks: updated }
    })
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    setPendingFile(file)
  }, [])

  const handleFileRemove = useCallback(() => {
    setRemovedImageId(formState.imageId)
    setPendingFile(null)
    updateField('imageUrl', undefined)
    updateField('imageId', undefined)
  }, [updateField, formState.imageId])

  const handleSubmit = useCallback(async () => {
    if (!formState.firstName.trim() || !formState.lastName.trim()) {
      return
    }

    const openedId = imageIdWhenDialogOpenedRef.current
    const replaceImageId =
      isEditing && pendingFile
        ? formState.imageId ||
          (openedId && removedImageId !== openedId ? openedId : undefined)
        : undefined

    const data: SpeakerFormSubmitData = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      socialLinks: formState.socialLinks
        .filter((link) => link.url.trim())
        .map((link) => toApiSocialLink(link)),
      localizationDrafts: { ...localizationDrafts },
      removedImageId,
      replaceImageId,
    }

    await onSubmit(data, pendingFile ?? undefined, { cascadeToEvents: shouldCascade })
  }, [formState, localizationDrafts, pendingFile, removedImageId, shouldCascade, isEditing, onSubmit])

  const isFormValid = formState.firstName.trim() && formState.lastName.trim()

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">{isEditing ? 'Edit Speaker' : 'Add Speaker'}</Heading>
            <Content>
              <Form>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
                  <div className={style({ display: 'flex', gap: 16 })}>
                    <TextField
                      label="First Name"
                      value={formState.firstName}
                      onChange={(value) => updateField('firstName', value)}
                      isRequired
                      styles={style({ width: '[100%]' })}
                    />
                    <TextField
                      label="Last Name"
                      value={formState.lastName}
                      onChange={(value) => updateField('lastName', value)}
                      isRequired
                      styles={style({ width: '[100%]' })}
                    />
                  </div>

                  <div style={{ width: '100%', maxWidth: 300 }}>
                    <ImageUploader
                      label="Profile Image"
                      imageUrl={formState.imageUrl}
                      imageId={formState.imageId}
                      imageKind="speaker-photo"
                      altText={`${formState.firstName} ${formState.lastName}`}
                      maxSizeMB={25}
                      width={300}
                      dropzoneTitle="Add profile image"
                      dropzoneDimensions="Dimensions 584 x 300 px"
                      deferUpload={true}
                      pendingFile={pendingFile || undefined}
                      onFileSelected={handleFileSelect}
                      onChange={(imageUrl, imageId) => {
                        updateField('imageUrl', imageUrl)
                        updateField('imageId', imageId)
                      }}
                      onRemove={handleFileRemove}
                    />
                  </div>

                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                    <Picker
                      label="Locale for title and bio"
                      description="Title and bio below apply to this locale."
                      selectedKey={selectedLocale}
                      onSelectionChange={handleLocaleChange}
                      styles={style({ width: '[100%]', maxWidth: 400 })}
                    >
                      {SUPPORTED_SPEAKER_LOCALES.map((loc) => (
                        <PickerItem key={loc} id={loc}>
                          {SPEAKER_LOCALE_LABELS[loc] ?? loc}
                        </PickerItem>
                      ))}
                    </Picker>
                    <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
                      Editing content for <strong style={{ fontWeight: 600 }}>{selectedLocale}</strong>.
                      Switch locale to add or change translations.
                    </Text>
                  </div>

                  <TextField
                    label="Title / Role"
                    value={activeLocaleDraft.title}
                    onChange={updateActiveLocaleTitle}
                    placeholder="e.g., Senior Product Designer at Adobe"
                    styles={style({ width: '[100%]' })}
                  />

                  <RichTextEditor
                    label="Bio (Optional)"
                    value={activeLocaleDraft.bio}
                    onChange={updateActiveLocaleBio}
                    height="150px"
                  />

                  <div>
                    <div
                      className={style({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      })}
                    >
                      <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Social Media Links</Text>
                      <ActionButton onPress={handleAddSocialLink} isQuiet>
                        <Add />
                        <Text>Add Link</Text>
                      </ActionButton>
                    </div>

                    {formState.socialLinks.length === 0 ? (
                      <Text
                        UNSAFE_style={{
                          fontSize: '14px',
                          color: 'var(--spectrum-global-color-gray-600)',
                          fontStyle: 'italic',
                        }}
                      >
                        No social media links added yet.
                      </Text>
                    ) : (
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                        {formState.socialLinks.map((socialLink, index) => {
                          const detectedPlatform = detectSocialPlatform(socialLink.url)
                          const valid = isValidUrl(socialLink.url)

                          return (
                            <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                              <div
                                style={{
                                  minWidth: 40,
                                  height: 40,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: detectedPlatform
                                    ? detectedPlatform.color
                                    : 'var(--spectrum-global-color-gray-400)',
                                  color: 'white',
                                  borderRadius: 4,
                                  fontSize: 16,
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

                              <ActionButton onPress={() => handleRemoveSocialLink(index)} isQuiet>
                                <RemoveCircle />
                              </ActionButton>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {isEditing && cascadeToEvents !== undefined && (
                    <div
                      style={{
                        padding: 16,
                        border: '1px solid var(--emc-cascade-callout-border)',
                        borderRadius: 8,
                        backgroundColor: 'var(--emc-cascade-callout-bg)',
                        color: 'var(--emc-cascade-callout-text)',
                      }}
                    >
                      <Checkbox isSelected={shouldCascade} onChange={setShouldCascade}>
                        Update this speaker in all linked events
                      </Checkbox>
                      <Text
                        UNSAFE_style={{
                          fontSize: '12px',
                          color: 'var(--emc-cascade-callout-text-muted)',
                          marginTop: '4px',
                        }}
                      >
                        This speaker is linked to events. Check this option to propagate changes to all
                        linked events.
                      </Text>
                    </div>
                  )}
                </div>
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => { onClose(); close() }} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="accent" onPress={handleSubmit} isDisabled={!isFormValid || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <ProgressCircle size="S" isIndeterminate aria-label="Submitting" />
                    <Text>Saving...</Text>
                  </>
                ) : (
                  <Text>{isEditing ? 'Update Speaker' : 'Add Speaker'}</Text>
                )}
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  )
}
