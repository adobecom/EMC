/* 
* <license header>
*/

import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Flex,
  TextField,
  Picker,
  Item,
  Button,
  Heading,
  Text,
  ActionButton,
  ProgressCircle
} from '@adobe/react-spectrum'
import { ProfileData, SeriesSpeaker, SpeakerType } from '../../types/domain'

// Speaker type options with display labels
const SPEAKER_TYPE_OPTIONS: { key: SpeakerType; label: string }[] = [
  { key: 'host', label: 'Host' },
  { key: 'presenter', label: 'Presenter' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'guest-speaker', label: 'Guest Speaker' },
  { key: 'keynote', label: 'Keynote' },
  { key: 'judge', label: 'Judge' },
  { key: 'portfolio-reviewer', label: 'Portfolio Reviewer' },
  { key: 'career-advisor', label: 'Career Advisor' },
  { key: 'product-demonstrator', label: 'Product Demonstrator' },
]
import { RichTextEditor, ImageUploader, AutocompleteTextField } from '../shared'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import Edit from '@spectrum-icons/workflow/Edit'
import SaveFloppy from '@spectrum-icons/workflow/SaveFloppy'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { detectSocialPlatform, isValidUrl } from '../../utils/socialPlatformDetector'
import { apiService } from '../../services/api'

interface SpeakersComponentProps {
  profiles: ProfileData[]
  seriesId?: string
  eventId?: string
  onAddProfile: () => void
  onRemoveProfile: (index: number) => void
  onUpdateProfile: (index: number, updates: Partial<ProfileData>) => void
  onAddSocialLink: (profileIndex: number) => void
  onRemoveSocialLink: (profileIndex: number, linkIndex: number) => void
  onUpdateSocialLink: (profileIndex: number, linkIndex: number, url: string) => void
}

export const SpeakersComponent: React.FC<SpeakersComponentProps> = ({
  profiles,
  seriesId,
  eventId,
  onAddProfile,
  onRemoveProfile,
  onUpdateProfile,
  onAddSocialLink,
  onRemoveSocialLink,
  onUpdateSocialLink
}) => {
  const [seriesSpeakers, setSeriesSpeakers] = useState<SeriesSpeaker[]>([])
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set())

  // Load series speakers for autocomplete
  useEffect(() => {
    if (!seriesId) return

    let isMounted = true

    const loadSeriesSpeakers = async () => {
      try {
        const response = await apiService.getSpeakers(seriesId)
        if (isMounted && response && !('error' in response)) {
          const speakers = response.speakers || response || []
          setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
        }
      } catch (err) {
        console.error('Failed to load series speakers:', err)
      }
    }

    loadSeriesSpeakers()

    return () => {
      isMounted = false
    }
  }, [seriesId])

  // Filter out already-selected speakers from autocomplete options
  const availableSpeakers = useMemo(() => {
    const selectedIds = new Set(profiles.map(p => p.speakerId).filter(Boolean))
    return seriesSpeakers.filter(s => !selectedIds.has(s.speakerId))
  }, [seriesSpeakers, profiles])

  // Check if a profile is in read-only mode
  const isReadOnly = (profile: ProfileData, index: number): boolean => {
    // If currently editing this profile, it's not read-only
    if (editingIndices.has(index)) return false
    // Read-only if saved to series or selected from series
    return !!(profile.isSaved || profile.isFromSeries)
  }

  // Handle selecting a speaker from autocomplete
  const handleSelectSpeaker = (index: number, speakerId: string | null) => {
    if (!speakerId) return

    const speaker = seriesSpeakers.find(s => s.speakerId === speakerId)
    if (!speaker) return

    onUpdateProfile(index, {
      speakerId: speaker.speakerId,
      firstName: speaker.firstName,
      lastName: speaker.lastName,
      title: speaker.title || '',
      bio: speaker.bio || '',
      imageUrl: speaker.photo?.imageUrl,
      imageId: speaker.photo?.imageId,
      socialLinks: speaker.socialMediaLinks?.map(link => ({
        platform: link.platform,
        url: link.url
      })) || [],
      isFromSeries: true,
      isSaved: true, // Already saved in series
      modificationTime: speaker.modificationTime
    })

    // Remove from editing mode if it was there
    setEditingIndices(prev => {
      const next = new Set(prev)
      next.delete(index)
      return next
    })
  }

  // Save speaker to series
  const handleSaveSpeaker = async (index: number) => {
    const profile = profiles[index]
    if (!seriesId || !profile.firstName || !profile.lastName) return

    setSavingIndex(index)

    try {
      const speakerData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        title: profile.title || '',
        bio: profile.bio || '',
        socialMediaLinks: profile.socialLinks?.filter(l => l.url) || []
      }

      let response
      if (profile.speakerId && profile.isSaved) {
        // Update existing speaker
        response = await apiService.updateSpeaker(
          { ...speakerData, speakerId: profile.speakerId, modificationTime: profile.modificationTime },
          seriesId
        )
      } else {
        // Create new speaker
        response = await apiService.createSpeaker(speakerData, seriesId)
      }

      if (response && !('error' in response)) {
        const savedSpeaker = response.speaker || response
        onUpdateProfile(index, {
          speakerId: savedSpeaker.speakerId,
          isSaved: true,
          isFromSeries: false,
          modificationTime: savedSpeaker.modificationTime
        })

        // Exit editing mode
        setEditingIndices(prev => {
          const next = new Set(prev)
          next.delete(index)
          return next
        })

        // Refresh series speakers list
        const refreshed = await apiService.getSpeakers(seriesId)
        if (refreshed && !('error' in refreshed)) {
          const speakers = refreshed.speakers || refreshed || []
          setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
        }
      } else {
        console.error('Failed to save speaker:', response)
      }
    } catch (err) {
      console.error('Error saving speaker:', err)
    } finally {
      setSavingIndex(null)
    }
  }

  // Toggle edit mode
  const handleToggleEdit = (index: number) => {
    setEditingIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Speakers & Hosts</Heading>
        <Button variant="primary" onPress={onAddProfile}>
          <Add />
          <Text>Add Profile</Text>
        </Button>
      </Flex>

      <Text>Add speaker and event host details. Profiles will appear in the order they were entered.</Text>

      {(!profiles || profiles.length === 0) && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No speakers or hosts added yet. Click "Add Profile" to add one.</Text>
        </View>
      )}

      {profiles && profiles.map((profile, index) => {
        const readOnly = isReadOnly(profile, index)
        const isSaving = savingIndex === index

        return (
          <View key={index} padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
              <Heading level={4}>
                {profile.firstName && profile.lastName 
                  ? `${profile.firstName} ${profile.lastName}`
                  : `Profile ${index + 1}`}
                {profile.isSaved && (
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-green-600)', marginLeft: '8px' }}>
                    ✓ Saved
                  </Text>
                )}
              </Heading>
              <Flex gap="size-100">
                {readOnly ? (
                  <ActionButton onPress={() => handleToggleEdit(index)} isQuiet aria-label="Edit">
                    <Edit />
                  </ActionButton>
                ) : null}
                <ActionButton onPress={() => onRemoveProfile(index)} isQuiet aria-label="Remove">
                  <Delete />
                </ActionButton>
              </Flex>
            </Flex>

            <Flex direction="column" gap="size-150">
              {/* Type Picker - Always editable */}
              <Picker
                label="Profile Type"
                selectedKey={profile.type}
                onSelectionChange={(key) => onUpdateProfile(index, { type: key as SpeakerType })}
                width="size-3000"
              >
                {SPEAKER_TYPE_OPTIONS.map(option => (
                  <Item key={option.key}>{option.label}</Item>
                ))}
              </Picker>

              {/* Name Fields */}
              <Flex direction="row" gap="size-150">
                {seriesId && !readOnly ? (
                  // Show autocomplete when series ID is available and not read-only
                  <>
                    <AutocompleteTextField
                      label="First Name"
                      value={profile.firstName}
                      onChange={(value) => onUpdateProfile(index, { firstName: value })}
                      onSelect={(option) => handleSelectSpeaker(index, option.id)}
                      options={availableSpeakers.map(speaker => ({
                        id: speaker.speakerId,
                        label: `${speaker.firstName} ${speaker.lastName}`,
                        imageUrl: speaker.photo?.imageUrl,
                        initials: `${speaker.firstName?.[0] || ''}${speaker.lastName?.[0] || ''}`
                      }))}
                    />
                    <AutocompleteTextField
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(value) => onUpdateProfile(index, { lastName: value })}
                      onSelect={(option) => handleSelectSpeaker(index, option.id)}
                      options={availableSpeakers.map(speaker => ({
                        id: speaker.speakerId,
                        label: `${speaker.firstName} ${speaker.lastName}`,
                        imageUrl: speaker.photo?.imageUrl,
                        initials: `${speaker.firstName?.[0] || ''}${speaker.lastName?.[0] || ''}`
                      }))}
                    />
                  </>
                ) : (
                  // Show regular text fields
                  <>
                    <TextField
                      label="First Name"
                      value={profile.firstName}
                      onChange={(value) => onUpdateProfile(index, { firstName: value })}
                      width="50%"
                      isReadOnly={readOnly}
                    />
                    <TextField
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(value) => onUpdateProfile(index, { lastName: value })}
                      width="50%"
                      isReadOnly={readOnly}
                    />
                  </>
                )}
              </Flex>

              {/* Profile Image */}
              {!readOnly && (
                <View width="100%" UNSAFE_style={{ maxWidth: '300px' }}>
                  <ImageUploader
                    label="Profile Image"
                    imageUrl={profile.imageUrl}
                    imageId={profile.imageId}
                    imageKind="profile-image"
                    altText={`${profile.firstName} ${profile.lastName}`}
                    eventId={eventId}
                    maxSizeMB={10}
                    width={300}
                    onChange={(imageUrl, imageId) => {
                      onUpdateProfile(index, { 
                        imageUrl: imageUrl, 
                        imageId: imageId 
                      })
                    }}
                    onRemove={() => {
                      onUpdateProfile(index, { 
                        imageUrl: undefined, 
                        imageId: undefined 
                      })
                    }}
                  />
                </View>
              )}

              {/* Show image preview in read-only mode */}
              {readOnly && profile.imageUrl && (
                <View width="100%" UNSAFE_style={{ maxWidth: '150px' }}>
                  <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    Profile Image
                  </Text>
                  <img 
                    src={profile.imageUrl} 
                    alt={`${profile.firstName} ${profile.lastName}`}
                    style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                  />
                </View>
              )}

              {/* Title */}
              <TextField
                label="Title"
                isQuiet
                value={profile.title}
                onChange={(value) => onUpdateProfile(index, { title: value })}
                isReadOnly={readOnly}
              />

              {/* Bio */}
              {!readOnly ? (
                <RichTextEditor
                  label="Bio (Optional)"
                  value={profile.bio || ''}
                  onChange={(value) => onUpdateProfile(index, { bio: value })}
                  height="200px"
                />
              ) : profile.bio ? (
                <View>
                  <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    Bio
                  </Text>
                  <View
                    padding="size-150"
                    backgroundColor="gray-75"
                    borderRadius="small"
                    UNSAFE_style={{ fontSize: '14px' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: profile.bio }} />
                  </View>
                </View>
              ) : null}

              {/* Social Links */}
              {!readOnly && (
                <View marginTop="size-200">
                  <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                    <Text UNSAFE_style={{ fontWeight: 'bold' }}>Social Media Links</Text>
                    <ActionButton onPress={() => onAddSocialLink(index)} isQuiet>
                      <Add />
                      <Text>Add Link</Text>
                    </ActionButton>
                  </Flex>

                  {(!profile.socialLinks || profile.socialLinks.length === 0) && (
                    <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                      No social media links added yet.
                    </Text>
                  )}

                  {profile.socialLinks && profile.socialLinks.map((socialLink, linkIndex) => {
                    const detectedPlatform = detectSocialPlatform(socialLink.url)
                    const isValid = isValidUrl(socialLink.url)
                    
                    return (
                      <Flex key={linkIndex} gap="size-100" alignItems="center" marginTop="size-100">
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
                          onChange={(value) => onUpdateSocialLink(index, linkIndex, value)}
                          width="100%"
                          validationState={socialLink.url && !isValid ? 'invalid' : undefined}
                        />

                        <ActionButton onPress={() => onRemoveSocialLink(index, linkIndex)} isQuiet>
                          <Delete />
                        </ActionButton>
                      </Flex>
                    )
                  })}
                </View>
              )}

              {/* Show social links in read-only mode */}
              {readOnly && profile.socialLinks && profile.socialLinks.length > 0 && (
                <View marginTop="size-100">
                  <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    Social Media Links
                  </Text>
                  <Flex direction="row" gap="size-100" wrap>
                    {profile.socialLinks.map((socialLink, linkIndex) => {
                      const detectedPlatform = detectSocialPlatform(socialLink.url)
                      return (
                        <a 
                          key={linkIndex} 
                          href={socialLink.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}
                        >
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
                              cursor: 'pointer'
                            }}
                          >
                            {detectedPlatform ? detectedPlatform.icon : <LinkOut />}
                          </View>
                        </a>
                      )
                    })}
                  </Flex>
                </View>
              )}

              {/* Save Button - Only show when not read-only and has required fields */}
              {!readOnly && seriesId && profile.firstName && profile.lastName && (
                <Flex justifyContent="end" marginTop="size-200">
                  <Button
                    variant="secondary"
                    onPress={() => handleSaveSpeaker(index)}
                    isDisabled={isSaving}
                  >
                    {isSaving ? (
                      <ProgressCircle aria-label="Saving" size="S" isIndeterminate />
                    ) : (
                      <SaveFloppy />
                    )}
                    <Text>{profile.isSaved ? 'Update Speaker' : 'Save Speaker'}</Text>
                  </Button>
                </Flex>
              )}
            </Flex>
          </View>
        )
      })}
    </Flex>
  )
}

