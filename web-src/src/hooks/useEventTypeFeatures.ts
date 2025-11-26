/* 
* <license header>
*/

import { useMemo } from 'react'
import { EventType, EventTypeFeatures, getEventTypeFeatures } from '../config/eventTypeConfig'

/**
 * Hook to get event type features configuration
 * Memoized to prevent unnecessary re-renders
 * 
 * @example
 * const { hasVenue, hasPageMetadata } = useEventTypeFeatures(formData.eventType)
 * 
 * // Then in JSX:
 * {hasVenue && <VenueComponent ... />}
 * {hasPageMetadata && <PageMetadataComponent ... />}
 */
export function useEventTypeFeatures(eventType: EventType | string): EventTypeFeatures {
  return useMemo(() => getEventTypeFeatures(eventType), [eventType])
}

/**
 * Hook that returns just the boolean feature flags as a flat object
 * Useful for destructuring specific features
 * 
 * @example
 * const { hasVenue, hasPageMetadata, hasOnDemandRecording } = useEventFeatureFlags('webinar')
 */
export function useEventFeatureFlags(eventType: EventType | string) {
  const features = useEventTypeFeatures(eventType)
  
  return useMemo(() => ({
    hasVenue: features.hasVenue,
    hasPageMetadata: features.hasPageMetadata,
    hasOnDemandRecording: features.hasOnDemandRecording ?? false,
    hasWebinarPlatformSettings: features.hasWebinarPlatformSettings ?? false,
    hasPhysicalCapacity: features.hasPhysicalCapacity ?? false,
    hasVirtualCapacity: features.hasVirtualCapacity ?? false,
  }), [features])
}


