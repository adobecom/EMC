/* 
* <license header>
*/

import React from 'react'
import {
  View,
  Flex,
  TextField,
  Button,
  Heading,
  Text,
  ActionButton
} from '@adobe/react-spectrum'
import { SponsorData } from '../../types/domain'
import { ImageUploader } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import Add from '@spectrum-icons/workflow/Add'
import Delete from '@spectrum-icons/workflow/Delete'

interface SponsorsComponentProps {
  sponsors: SponsorData[]
  eventId?: string
  onAddSponsor: () => void
  onRemoveSponsor: (index: number) => void
  onUpdateSponsor: (index: number, updates: Partial<SponsorData>) => void
  onSaveSponsor: (index: number) => void
}

export const SponsorsComponent: React.FC<SponsorsComponentProps> = ({
  sponsors,
  eventId,
  onAddSponsor,
  onRemoveSponsor,
  onUpdateSponsor,
  onSaveSponsor
}) => {
  return (
    <Flex direction="column" gap="size-200">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Sponsors & Partners</Heading>
        <Button variant="primary" onPress={onAddSponsor}>
          <Add />
          <Text>Add Sponsor</Text>
        </Button>
      </Flex>

      <Text>Add sponsor and partner information to display on your event page.</Text>

      {(!sponsors || sponsors.length === 0) && (
        <View padding="size-200" backgroundColor="gray-100" borderRadius="medium">
          <Text>No sponsors added yet. Click "Add Sponsor" to add one.</Text>
        </View>
      )}

      {sponsors && sponsors.map((sponsor, index) => (
        <View 
          key={sponsor.id} 
          padding="size-200" 
          borderWidth="thin" 
          borderColor="dark" 
          borderRadius="medium"
          UNSAFE_style={{ position: 'relative' }}
        >
          {/* Delete Button - Top Right */}
          <Flex justifyContent="end" marginBottom="size-100">
            <ActionButton onPress={() => onRemoveSponsor(index)} isQuiet>
              <Delete />
            </ActionButton>
          </Flex>

          {/* Main Content - Image and Fields */}
          <Flex direction="row" gap="size-300" alignItems="start">
            {/* Image Uploader - Left Side */}
            <View UNSAFE_style={{ maxWidth: '300px', flexShrink: 0 }}>
              <ImageUploader
                label="Sponsor Logo"
                imageUrl={sponsor.imageUrl}
                imageId={sponsor.imageId}
                imageKind="sponsor-logo"
                altText={sponsor.partnerName || 'Sponsor logo'}
                eventId={eventId}
                maxSizeMB={5}
                recommendedDimensions="400px x 200px"
                onChange={(imageUrl, imageId) => {
                  onUpdateSponsor(index, { 
                    imageUrl: imageUrl, 
                    imageId: imageId 
                  })
                }}
                onRemove={() => {
                  onUpdateSponsor(index, { 
                    imageUrl: undefined, 
                    imageId: undefined 
                  })
                }}
              />
            </View>

            {/* Fields - Right Side */}
            <Flex direction="column" gap="size-150" width="100%">
              <TextField
                label="Partner Name"
                isRequired
                value={sponsor.partnerName}
                onChange={(value) => onUpdateSponsor(index, { partnerName: value })}
                width="100%"
              />

              <TextField
                label="Partner External URL"
                isRequired
                value={sponsor.partnerUrl}
                onChange={(value) => onUpdateSponsor(index, { partnerUrl: value })}
                width="100%"
                placeholder="https://..."
              />
            </Flex>
          </Flex>

          {/* Save Button - Bottom Right */}
          <Flex justifyContent="end" marginTop="size-200">
            <Button 
              variant={sponsor.isSaved ? "secondary" : "cta"}
              onPress={() => onSaveSponsor(index)}
              isDisabled={!sponsor.partnerName || !sponsor.partnerUrl}
            >
              {sponsor.isSaved ? 'Saved ✓' : 'Save Partner'}
            </Button>
          </Flex>
        </View>
      ))}
    </Flex>
  )
}

