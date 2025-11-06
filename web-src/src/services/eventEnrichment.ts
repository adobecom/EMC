/* 
* <license header>
*/

import { createEnrichmentManager } from './dataEnrichment'
import { apiService } from './api'
import { EventApiResponse, EventImage } from '../types/domain'

/**
 * Enriched data types for events
 */
export interface EventThumbnail {
  imageUrl: string
  altText?: string
  imageKind?: string
}

/**
 * Extract thumbnail URL from event images with priority order:
 * 1. event-card-image
 * 2. event-hero-image
 * 3. venue-image
 * 4. first image available
 */
export function extractThumbnailFromEvent(event: EventApiResponse): EventThumbnail | null {
  const images = event.images || []
  
  if (images.length === 0) {
    return null
  }

  const cardImage = images.find((photo) => photo.imageKind === 'event-card-image')
  const heroImage = images.find((photo) => photo.imageKind === 'event-hero-image')
  const venueImage = images.find((photo) => photo.imageKind === 'venue-image')
  
  const selectedImage = cardImage || heroImage || venueImage || images[0]
  
  if (!selectedImage?.imageUrl) {
    return null
  }

  return {
    imageUrl: selectedImage.imageUrl,
    altText: selectedImage.altText,
    imageKind: selectedImage.imageKind
  }
}

/**
 * Thumbnail enrichment manager
 * Handles fetching, caching, and batching thumbnail requests
 */
export const thumbnailEnrichmentManager = createEnrichmentManager<string, EventThumbnail>(
  async (eventIds: string[]) => {
    const results = new Map<string, EventThumbnail>()
    
    try {
      // Fetch event images in batch
      const eventImages = await apiService.getEventImagesBatch(eventIds)
      
      // Extract thumbnails from each event
      eventImages.forEach((event, eventId) => {
        const thumbnail = extractThumbnailFromEvent(event)
        if (thumbnail) {
          results.set(eventId, thumbnail)
        }
      })
      
    } catch (error) {
      console.error('Error enriching event thumbnails:', error)
    }
    
    return results
  },
  {
    cacheDuration: 10 * 60 * 1000, // Cache for 10 minutes
    batchDelay: 150, // Wait 150ms to batch requests
    maxBatchSize: 20 // Fetch up to 20 events at once
  }
)

/**
 * Creator/Modifier enrichment manager (placeholder for future implementation)
 */
export interface UserInfo {
  userId: string
  userName: string
  email?: string
}

export const userEnrichmentManager = createEnrichmentManager<string, UserInfo>(
  async () => {
    // TODO: Implement user details fetching when API is available
    return new Map<string, UserInfo>()
  },
  {
    cacheDuration: 30 * 60 * 1000, // Cache for 30 minutes (users change less frequently)
    batchDelay: 200,
    maxBatchSize: 50
  }
)

/**
 * Clear all enrichment caches
 */
export function clearAllEnrichmentCaches(): void {
  thumbnailEnrichmentManager.clearCache()
  userEnrichmentManager.clearCache()
}

