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
 * Accepts an optional cloudType to apply cloud-level gating on top of
 * the per-event-type config.  Features that are exclusive to a specific
 * cloud (e.g. PageMetadata → ExperienceCloud only) are resolved here so
 * consumers can rely on a single boolean without extra inline checks.
 * 
 * @example
 * const { hasVenue, hasPageMetadata } = useEventFeatureFlags('webinar', 'ExperienceCloud')
 */
export function useEventFeatureFlags(
  eventType: EventType | string,
  cloudType?: string,
) {
  const features = useEventTypeFeatures(eventType)
  
  const isExperienceCloud = cloudType === 'ExperienceCloud'

  return useMemo(() => ({
    hasVenue: features.hasVenue,
    hasPageMetadata: features.hasPageMetadata && isExperienceCloud,
    hasMarketoIntegration: (features.hasMarketoIntegration ?? false) && isExperienceCloud,
    hasOnDemandRecording: features.hasOnDemandRecording ?? false,
    hasWebinarPlatformSettings: features.hasWebinarPlatformSettings ?? false,
    hasPhysicalCapacity: features.hasPhysicalCapacity ?? false,
    hasVirtualCapacity: features.hasVirtualCapacity ?? false,
  }), [features, isExperienceCloud])
}


