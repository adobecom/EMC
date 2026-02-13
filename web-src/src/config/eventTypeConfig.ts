/* 
* <license header>
* 
* Event Type Configuration
* Centralized configuration for which components/features are visible per event type.
* This makes it easy to:
* - See at a glance what each event type includes
* - Add new event types
* - Toggle features without hunting through JSX
*/

export type EventType = 'in-person' | 'webinar'

// Define which features/components are available for each event type
export interface EventTypeFeatures {
  // Step 1: Add Content
  hasVenue: boolean
  hasPageMetadata: boolean
  hasMarketoIntegration: boolean
  
  // Step 2: Additional Info (future)
  hasOnDemandRecording?: boolean
  hasWebinarPlatformSettings?: boolean
  
  // Registration
  hasPhysicalCapacity?: boolean
  hasVirtualCapacity?: boolean
  
  // Display settings
  label: string
  description: string
}

/**
 * Centralized configuration for event type features
 * Add new event types here and their feature flags will be available throughout the app
 */
export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeFeatures> = {
  'in-person': {
    label: 'In-Person Event',
    description: 'Physical event at a venue location',
    hasVenue: true,
    hasPageMetadata: true,
    hasMarketoIntegration: true,
    hasPhysicalCapacity: true,
    hasVirtualCapacity: false,
    hasOnDemandRecording: false,
    hasWebinarPlatformSettings: false,
  },
  'webinar': {
    label: 'Webinar',
    description: 'Virtual event streamed online',
    hasVenue: false,
    hasPageMetadata: true,
    hasMarketoIntegration: true,
    hasPhysicalCapacity: false,
    hasVirtualCapacity: true,
    hasOnDemandRecording: true,
    hasWebinarPlatformSettings: true,
  },
}

/**
 * Helper function to get features for an event type
 * Returns default in-person config if event type is unknown
 */
export function getEventTypeFeatures(eventType: EventType | string): EventTypeFeatures {
  return EVENT_TYPE_CONFIG[eventType as EventType] || EVENT_TYPE_CONFIG['in-person']
}

/**
 * Helper hook-friendly function to check if a feature is enabled
 */
export function isFeatureEnabled(eventType: EventType | string, feature: keyof EventTypeFeatures): boolean {
  const config = getEventTypeFeatures(eventType)
  return !!config[feature]
}

/**
 * Get all available event types for dropdowns/menus
 */
export function getEventTypeOptions(): Array<{ key: EventType; label: string; description: string }> {
  return Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => ({
    key: key as EventType,
    label: config.label,
    description: config.description,
  }))
}


