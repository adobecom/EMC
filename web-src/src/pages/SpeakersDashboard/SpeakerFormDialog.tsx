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
  Form,
  View,
  Flex,
  Text,
  ActionButton,
  ProgressCircle,
  Checkbox
} from '@adobe/react-spectrum'
import { Button, ButtonGroup, TextField, Dialog, DialogTrigger, Content, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { SpeakerDashboardItem } from './SpeakersDashboard'
import { SocialLinkFormData } from '../../types/domain'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { detectSocialPlatform, isValidUrl, toApiSocialLink, fromApiSocialLink } from '../../utils/socialPlatformDetector'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'

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
                <Flex direction="column" gap={FLEX_GAP.SECTION}>
                  {/* Name Fields */}
                  <Flex direction="row" gap={FLEX_GAP.FIELD}>
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
                  </Flex>

                  {/* Profile Image */}
                  <View width="100%" UNSAFE_style={{ maxWidth: '300px' }}>
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
                  </View>

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
                  <View>
                    <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                      <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Social Media Links</Text>
                      <ActionButton onPress={handleAddSocialLink} isQuiet>
                        <Add />
                        <Text>Add Link</Text>
                      </ActionButton>
                    </Flex>

                    {formState.socialLinks.length === 0 ? (
                      <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                        No social media links added yet.
                      </Text>
                    ) : (
                      <Flex direction="column" gap="size-100">
                        {formState.socialLinks.map((socialLink, index) => {
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
                                  fontWeight: 'bold'
                                }}
                              >
                                {detectedPlatform ? detectedPlatform.icon : <LinkOut />}
                              </View>

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
                            </Flex>
                          )
                        })}
                      </Flex>
                    )}
                  </View>

                  {/* Cascade option (only shown for editing with linked events) */}
                  {isEditing && cascadeToEvents !== undefined && (
                    <View
                      padding="size-200"
                      borderWidth="thin"
                      borderColor="yellow-400"
                      borderRadius="medium"
                      backgroundColor="yellow-400"
                    >
                      <Checkbox
                        isSelected={shouldCascade}
                        onChange={setShouldCascade}
                      >
                        <Text>Update this speaker in all linked events</Text>
                      </Checkbox>
                      <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px' }}>
                        This speaker is linked to events. Check this option to propagate changes to all linked events.
                      </Text>
                    </View>
                  )}
                </Flex>
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
