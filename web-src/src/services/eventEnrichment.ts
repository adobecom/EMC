/* 
* <license header>
*/

import { createEnrichmentManager } from './dataEnrichment'
import { cachedApi } from './api'
import { EventApiResponse, Venue, EventHistoryResponse, HistoryUser } from '../types/domain'
import { clearSeriesEnrichmentCaches } from './seriesEnrichment'

/**
 * Enriched data types for events
 */
export interface EventThumbnail {
  imageUrl: string
  altText?: string
  imageKind?: string
}

export interface EventVenueInfo {
  venueName: string
  city?: string
  state?: string
  country?: string
  formattedAddress?: string
}

export interface EventHistoryInfo {
  creator?: HistoryUser
  modifier?: HistoryUser
  publishedAt?: number
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
      const eventImages = await cachedApi.getEventImagesBatch(eventIds)
      
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
 * Extract venue information from venues array
 * Takes the first venue if multiple are present
 */
export function extractVenueInfo(venues: Venue[]): EventVenueInfo | null {
  if (!venues || venues.length === 0) {
    return null
  }
  
  const venue = venues[0] // Use the first venue
  
  return {
    venueName: venue.venueName,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    formattedAddress: venue.formattedAddress
  }
}

/**
 * Venue enrichment manager
 * Handles fetching, caching, and batching venue requests
 */
export const venueEnrichmentManager = createEnrichmentManager<string, EventVenueInfo>(
  async (eventIds: string[]) => {
    const results = new Map<string, EventVenueInfo>()
    
    try {
      // Fetch event venues in batch
      const eventVenues = await cachedApi.getEventVenuesBatch(eventIds)
      
      // Extract venue info from each event
      eventVenues.forEach((venues, eventId) => {
        const venueInfo = extractVenueInfo(venues)
        if (venueInfo) {
          results.set(eventId, venueInfo)
        }
      })
      
    } catch (error) {
      console.error('Error enriching event venues:', error)
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
 * Extract history information from event history response
 * - Creator: User from the first history record
 * - Modifier: User from the last history record
 * - Published At: Timestamp from the last record where diff.updated.published is true
 */
export function extractHistoryInfo(historyResponse: EventHistoryResponse): EventHistoryInfo | null {
  const { history } = historyResponse
  
  if (!history || history.length === 0) {
    return null
  }
  
  const result: EventHistoryInfo = {}
  
  // Creator: first record's user
  if (history[0]?.user) {
    result.creator = history[0].user
  }
  
  // Modifier: last record's user
  if (history[history.length - 1]?.user) {
    result.modifier = history[history.length - 1].user
  }
  
  // Published At: last timestamp where diff.updated.published is true
  // Iterate from the end to find the most recent publish event
  for (let i = history.length - 1; i >= 0; i--) {
    const record = history[i]
    if (record.diff?.updated?.published === true) {
      result.publishedAt = record.timestamp
      break
    }
  }
  
  return result
}

/**
 * History enrichment manager
 * Handles fetching, caching, and batching history requests for creator, modifier, and published at
 */
export const historyEnrichmentManager = createEnrichmentManager<string, EventHistoryInfo>(
  async (eventIds: string[]) => {
    const results = new Map<string, EventHistoryInfo>()
    
    try {
      // Fetch event histories in batch
      const historyData = await cachedApi.getEventHistoryBatch(eventIds)
      
      // Extract history info from each event
      historyData.forEach((history, eventId) => {
        const historyInfo = extractHistoryInfo(history)
        if (historyInfo) {
          results.set(eventId, historyInfo)
        }
      })
      
    } catch (error) {
      console.error('Error enriching event history:', error)
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
 * Clear all enrichment caches (events only)
 */
export function clearEventEnrichmentCaches(): void {
  thumbnailEnrichmentManager.clearCache()
  venueEnrichmentManager.clearCache()
  historyEnrichmentManager.clearCache()
  userEnrichmentManager.clearCache()
}

/**
 * Clear all enrichment caches (events and series)
 */
export function clearAllEnrichmentCaches(): void {
  clearEventEnrichmentCaches()
  clearSeriesEnrichmentCaches()
}

