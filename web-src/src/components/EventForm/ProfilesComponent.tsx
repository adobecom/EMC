/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Flex,
  TextField,
  Picker,
  Item,
  Button,
  Heading,
  Text,
  ActionButton
} from '@adobe/react-spectrum'
import { ProfileData, SocialLinkFormData } from '../../types/domain'
import { RichTextEditor, ImageUploader } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'
import LinkOut from '@spectrum-icons/workflow/LinkOut'
import { detectSocialPlatform, isValidUrl } from '../../utils/socialPlatformDetector'

interface ProfilesComponentProps {
  profiles: ProfileData[]
  eventId?: string
  onAddProfile: () => void
  onRemoveProfile: (index: number) => void
  onUpdateProfile: (index: number, updates: Partial<ProfileData>) => void
  onAddSocialLink: (profileIndex: number) => void
  onRemoveSocialLink: (profileIndex: number, linkIndex: number) => void
  onUpdateSocialLink: (profileIndex: number, linkIndex: number, url: string) => void
}

export const ProfilesComponent: React.FC<ProfilesComponentProps> = ({
  profiles,
  eventId,
  onAddProfile,
  onRemoveProfile,
  onUpdateProfile,
  onAddSocialLink,
  onRemoveSocialLink,
  onUpdateSocialLink
}) => {
  return (
    <Flex direction="column" gap="size-200">
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

      {profiles && profiles.map((profile, index) => (
        <View key={index} padding="size-200" borderWidth="thin" borderColor="dark" borderRadius="medium">
          <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
            <Heading level={4}>Profile {index + 1}</Heading>
            <ActionButton onPress={() => onRemoveProfile(index)} isQuiet>
              <Delete />
            </ActionButton>
          </Flex>

          <Flex direction="column" gap="size-150">
            <Picker
              label="Profile Type"
              selectedKey={profile.type}
              onSelectionChange={(key) => onUpdateProfile(index, { type: key as 'speaker' | 'host' })}
            >
              <Item key="speaker">Speaker</Item>
              <Item key="host">Host</Item>
            </Picker>

            <Flex direction="row" gap="size-150">
              <TextField
                label="First Name"
                value={profile.firstName}
                onChange={(value) => onUpdateProfile(index, { firstName: value })}
                width="50%"
              />
              <TextField
                label="Last Name"
                value={profile.lastName}
                onChange={(value) => onUpdateProfile(index, { lastName: value })}
                width="50%"
              />
            </Flex>

            <View width="100%" UNSAFE_style={{ maxWidth: '400px' }}>
              <ImageUploader
                label="Profile Image"
                imageUrl={profile.imageUrl}
                imageId={profile.imageId}
                imageKind="profile-image"
                altText={`${profile.firstName} ${profile.lastName}`}
                eventId={eventId}
                maxSizeMB={10}
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

            <TextField
              label="Title"
              value={profile.title}
              onChange={(value) => onUpdateProfile(index, { title: value })}
            />

            <RichTextEditor
              label="Bio (Optional)"
              value={profile.bio || ''}
              onChange={(value) => onUpdateProfile(index, { bio: value })}
              height="200px"
            />

            {/* Social Links */}
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
                    {/* Platform Icon/Indicator */}
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

                    {/* URL Input */}
                    <TextField
                      placeholder="https://..."
                      value={socialLink.url}
                      onChange={(value) => onUpdateSocialLink(index, linkIndex, value)}
                      width="100%"
                      validationState={socialLink.url && !isValid ? 'invalid' : undefined}
                    />

                    {/* Remove Button */}
                    <ActionButton onPress={() => onRemoveSocialLink(index, linkIndex)} isQuiet>
                      <Delete />
                    </ActionButton>
                  </Flex>
                )
              })}
            </View>
          </Flex>
        </View>
      ))}
    </Flex>
  )
}

