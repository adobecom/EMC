/* 
* <license header>
*/

import React from 'react'
import {
  Flex,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { EventImageData } from '../../types/domain'
import { ImageUploader } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'

interface EventImagesComponentProps {
  images: EventImageData[]
  eventId?: string
  onUpdateImages: (images: EventImageData[]) => void
}

export const EventImagesComponent: React.FC<EventImagesComponentProps> = ({
  images,
  eventId,
  onUpdateImages
}) => {
  const handleImageChange = (imageKind: string, imageUrl: string, imageId: string) => {
    const existingIndex = images.findIndex((img) => img.imageKind === imageKind)
    const updatedImages = [...images]
    
    if (existingIndex >= 0) {
      updatedImages[existingIndex] = { imageKind, imageUrl, imageId }
    } else {
      updatedImages.push({ imageKind, imageUrl, imageId })
    }
    
    onUpdateImages(updatedImages)
  }

  const handleImageRemove = (imageKind: string) => {
    const filtered = images.filter((img) => img.imageKind !== imageKind)
    onUpdateImages(filtered)
  }

  return (
    <Flex direction="column" gap="size-300">
      <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Event Images</Heading>
      <Text>
        Add images for your event. These images will be displayed on the event page and listing.
      </Text>

      {/* Hero Image */}
      <ImageUploader
        label="Hero Image"
        imageUrl={images?.find((img) => img.imageKind === 'event-hero-image')?.imageUrl}
        imageId={images?.find((img) => img.imageKind === 'event-hero-image')?.imageId}
        imageKind="event-hero-image"
        altText="Event hero image"
        eventId={eventId}
        description="Main banner image displayed at the top of the event page"
        recommendedDimensions="1920px x 1080px"
        maxSizeMB={25}
        onChange={(imageUrl, imageId) => handleImageChange('event-hero-image', imageUrl, imageId)}
        onRemove={() => handleImageRemove('event-hero-image')}
      />

      {/* Thumbnail Image */}
      <ImageUploader
        label="Thumbnail Image"
        imageUrl={images?.find((img) => img.imageKind === 'event-card-image')?.imageUrl}
        imageId={images?.find((img) => img.imageKind === 'event-card-image')?.imageId}
        imageKind="event-card-image"
        altText="Event thumbnail image"
        eventId={eventId}
        description="Thumbnail image displayed in event listings and cards"
        recommendedDimensions="460px x 460px"
        maxSizeMB={10}
        onChange={(imageUrl, imageId) => handleImageChange('event-card-image', imageUrl, imageId)}
        onRemove={() => handleImageRemove('event-card-image')}
      />

      {/* Venue Image */}
      <ImageUploader
        label="Venue Image"
        imageUrl={images?.find((img) => img.imageKind === 'venue-image')?.imageUrl}
        imageId={images?.find((img) => img.imageKind === 'venue-image')?.imageId}
        imageKind="venue-image"
        altText="Venue image"
        eventId={eventId}
        description="Image of the event venue location"
        recommendedDimensions="1920px x 1080px"
        maxSizeMB={25}
        onChange={(imageUrl, imageId) => handleImageChange('venue-image', imageUrl, imageId)}
        onRemove={() => handleImageRemove('venue-image')}
      />
    </Flex>
  )
}

