/* 
* <license header>
*/

/**
 * SpeakerFormDialog - Modal dialog for creating/editing speakers
 * 
 * Features:
 * - Full speaker profile editing (name, title, bio, image, social links)
 * - Image upload support with deferred upload pattern
 * - Social media link management with platform detection
 * - Localization support for title and bio fields
 */

import React, { useState, useCallback, useEffect } from 'react'
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
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import Delete from '@react-spectrum/s2/icons/Delete'
import OpenIn from '@react-spectrum/s2/icons/OpenIn'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { SocialLinkFormData } from '../../types/domain'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { detectSocialPlatform, isValidUrl, toApiSocialLink, fromApiSocialLink } from '../../utils/socialPlatformDetector'
import { TYPOGRAPHY } from '../../styles/designSystem'

interface SpeakerFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any, cascadeToEvents?: boolean) => Promise<void>
  speaker: SpeakerDashboardItem | null
  seriesId: string
  isSubmitting: boolean
  cascadeToEvents?: boolean
}

interface FormState {
  firstName: string
  lastName: string
  title: string
  bio: string
  socialLinks: SocialLinkFormData[]
  imageUrl?: string
  imageId?: string
}

const initialFormState: FormState = {
  firstName: '',
  lastName: '',
  title: '',
  bio: '',
  socialLinks: []
}

export const SpeakerFormDialog: React.FC<SpeakerFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  speaker,
  seriesId: _seriesId,  // Reserved for future use
  isSubmitting,
  cascadeToEvents
}) => {
  void _seriesId  // Suppress unused variable warning
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [shouldCascade, setShouldCascade] = useState(cascadeToEvents ?? false)
  
  const isEditing = !!speaker
  
  // Reset form when dialog opens/closes or speaker changes
  useEffect(() => {
    if (isOpen && speaker) {
      setFormState({
        firstName: speaker.firstName || '',
        lastName: speaker.lastName || '',
        title: speaker.title || '',
        bio: speaker.bio || '',
        socialLinks: speaker.socialLinks?.map(link => fromApiSocialLink(link)) || [],
        imageUrl: speaker.photo?.imageUrl,
        imageId: speaker.photo?.imageId
      })
      setShouldCascade(cascadeToEvents ?? false)
    } else if (isOpen) {
      setFormState(initialFormState)
      setPendingFile(null)
      setShouldCascade(false)
    }
  }, [isOpen, speaker, cascadeToEvents])
  
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }, [])
  
  const handleAddSocialLink = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { url: '' }]
    }))
  }, [])
  
  const handleRemoveSocialLink = useCallback((index: number) => {
    setFormState(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }))
  }, [])
  
  const handleUpdateSocialLink = useCallback((index: number, url: string) => {
    setFormState(prev => {
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
    setPendingFile(null)
    updateField('imageUrl', undefined)
    updateField('imageId', undefined)
  }, [updateField])
  
  const handleSubmit = useCallback(async () => {
    if (!formState.firstName.trim() || !formState.lastName.trim()) {
      return
    }
    
    // Build speaker data payload
    const speakerData: any = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      socialLinks: formState.socialLinks
        .filter(link => link.url.trim())
        .map(link => toApiSocialLink(link))
    }
    
    // Add localizable fields
    const localizableFields: Record<string, any> = {}
    if (formState.title.trim()) {
      localizableFields.title = formState.title.trim()
    }
    if (formState.bio.trim()) {
      localizableFields.bio = formState.bio.trim()
    }
    
    if (Object.keys(localizableFields).length > 0) {
      speakerData.localizations = {
        'en-US': localizableFields // Default to en-US for now
      }
    }
    
    // Handle pending image file (to be uploaded after speaker creation/update)
    if (pendingFile) {
      speakerData._pendingFile = pendingFile
    }
    
    await onSubmit(speakerData, shouldCascade)
  }, [formState, pendingFile, shouldCascade, onSubmit])
  
  const isFormValid = formState.firstName.trim() && formState.lastName.trim()
  
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        {({close}) => (
          <>
            <Heading slot="title">{isEditing ? 'Edit Speaker' : 'Add Speaker'}</Heading>
            <Content>
              <Form>
                <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
                  {/* Name Fields */}
                  <div className={style({display: 'flex', gap: 16})}>
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

                  {/* Profile Image */}
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

                  {/* Title */}
                  <TextField
                    label="Title / Role"
                    value={formState.title}
                    onChange={(value) => updateField('title', value)}
                    placeholder="e.g., Senior Product Designer at Adobe"
                    styles={style({ width: '[100%]' })}
                  />

                  {/* Bio */}
                  <RichTextEditor
                    label="Bio (Optional)"
                    value={formState.bio}
                    onChange={(value) => updateField('bio', value)}
                    height="150px"
                  />

                  {/* Social Links */}
                  <div>
                    <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8})}>
                      <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Social Media Links</Text>
                      <ActionButton onPress={handleAddSocialLink} isQuiet>
                        <Add />
                        <Text>Add Link</Text>
                      </ActionButton>
                    </div>

                    {formState.socialLinks.length === 0 ? (
                      <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                        No social media links added yet.
                      </Text>
                    ) : (
                      <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
                        {formState.socialLinks.map((socialLink, index) => {
                          const detectedPlatform = detectSocialPlatform(socialLink.url)
                          const valid = isValidUrl(socialLink.url)

                          return (
                            <div key={index} className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
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
                                <Delete />
                              </ActionButton>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cascade option (only shown for editing with linked events) */}
                  {isEditing && cascadeToEvents !== undefined && (
                    <div
                      style={{
                        padding: 16,
                        border: '1px solid var(--spectrum-global-color-yellow-400)',
                        borderRadius: 8,
                        backgroundColor: 'var(--spectrum-global-color-yellow-400)',
                      }}
                    >
                      <Checkbox
                        isSelected={shouldCascade}
                        onChange={setShouldCascade}
                      >
                        Update this speaker in all linked events
                      </Checkbox>
                      <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px' }}>
                        This speaker is linked to events. Check this option to propagate changes to all linked events.
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
              <Button
                variant="accent"
                onPress={handleSubmit}
                isDisabled={!isFormValid || isSubmitting}
              >
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
