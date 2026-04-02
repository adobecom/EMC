/* 
* <license header>
*/

import React, { useCallback } from 'react'
import { Heading, Text } from '@react-spectrum/s2'
import type { EventImageData as _EventImageData } from '../../types/domain'
import { ImageUploader } from '../../components/shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * EventImagesComponent - Manages event images (hero, thumbnail, venue)
 * 
 * Uses EventFormContext for state management.
 * Image uploads are handled by the ImageUploader component which makes
 * its own API calls. This component just tracks the image IDs/URLs.
 */
export const EventImagesComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
  } = useEventFormComponent({
    componentId: 'event-images',
  })
  
  const images = formData.images || []

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleImageChange = useCallback((imageKind: string, imageUrl: string, imageId: string) => {
    const existingIndex = images.findIndex((img) => img.imageKind === imageKind)
    const updatedImages = [...images]
    
    if (existingIndex >= 0) {
      updatedImages[existingIndex] = { imageKind, imageUrl, imageId }
    } else {
      updatedImages.push({ imageKind, imageUrl, imageId })
    }
    
    updateFormData({ images: updatedImages })
  }, [images, updateFormData])

  const handleImageRemove = useCallback((imageKind: string) => {
    const filtered = images.filter((img) => img.imageKind !== imageKind)
    updateFormData({ images: filtered })
  }, [images, updateFormData])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Event Images</Heading>
      <Text>
        Add images for your event. These images will be displayed on the event page and listing.
      </Text>

      {/* Hero Image */}
      <div data-testid="hero-image-uploader">
        <ImageUploader
          label="Hero Image"
          imageUrl={images?.find((img) => img.imageKind === 'event-hero-image')?.imageUrl}
          imageId={images?.find((img) => img.imageKind === 'event-hero-image')?.imageId}
          imageKind="event-hero-image"
          altText="Event hero image"
          eventId={eventId ?? undefined}
          description="Main banner image displayed at the top of the event page"
          recommendedDimensions="1920px x 1080px"
          maxSizeMB={25}
          width={600}
          onChange={(imageUrl, imageId) => handleImageChange('event-hero-image', imageUrl, imageId)}
          onRemove={() => handleImageRemove('event-hero-image')}
        />
      </div>

      {/* Thumbnail Image */}
      <div data-testid="card-image-uploader">
        <ImageUploader
          label="Thumbnail Image"
          imageUrl={images?.find((img) => img.imageKind === 'event-card-image')?.imageUrl}
          imageId={images?.find((img) => img.imageKind === 'event-card-image')?.imageId}
          imageKind="event-card-image"
          altText="Event thumbnail image"
          eventId={eventId ?? undefined}
          description="Thumbnail image displayed in event listings and cards"
          recommendedDimensions="460px x 460px"
          maxSizeMB={10}
          width={300}
          onChange={(imageUrl, imageId) => handleImageChange('event-card-image', imageUrl, imageId)}
          onRemove={() => handleImageRemove('event-card-image')}
        />
      </div>

      {/* Venue Image */}
      <ImageUploader
        label="Venue Image"
        imageUrl={images?.find((img) => img.imageKind === 'venue-image')?.imageUrl}
        imageId={images?.find((img) => img.imageKind === 'venue-image')?.imageId}
        imageKind="venue-image"
        altText="Venue image"
        eventId={eventId ?? undefined}
        description="Image of the event venue location"
        recommendedDimensions="1920px x 1080px"
        maxSizeMB={25}
        width={600}
        onChange={(imageUrl, imageId) => handleImageChange('venue-image', imageUrl, imageId)}
        onRemove={() => handleImageRemove('venue-image')}
      />
    </div>
  )
}
