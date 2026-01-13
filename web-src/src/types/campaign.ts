/* 
* <license header>
*/

/**
 * Campaign type definitions
 * 
 * A Campaign is an object attached to an event that provides a unique
 * registration URL with optional capacity limits.
 */

/**
 * Campaign data from the API
 */
export interface Campaign {
  /** Unique identifier for the campaign */
  campaignId: string
  /** Parent event ID */
  eventId: string
  /** Campaign name for display */
  name: string
  /** Auto-generated URL slug appended to event URL */
  urlParam: string
  /** Optional capacity limit for this campaign */
  capacityLimit?: number
  /** Number of registrations through this campaign */
  registrationCount: number
  /** Whether the campaign is currently active */
  isActive: boolean
  /** Creation timestamp */
  creationTime: number
  /** Last modification timestamp */
  modificationTime: number
  /** User who created the campaign */
  createdBy?: string
  /** User who last modified the campaign */
  modifiedBy?: string
}

/**
 * Campaign form data for create/update operations
 */
export interface CampaignFormData {
  name: string
  capacityLimit?: number
  isActive: boolean
}

/**
 * Campaign statistics for dashboard display
 */
export interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalCampaignRegistrations: number
  /** Available capacity across all campaigns */
  availableCapacity: number
}

/**
 * Generate a URL-safe slug from a campaign name
 */
export function generateUrlParam(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

/**
 * Calculate campaign statistics
 */
export function calculateCampaignStats(
  campaigns: Campaign[],
  eventCapacity?: number
): CampaignStats {
  const activeCampaigns = campaigns.filter(c => c.isActive)
  const totalCampaignRegistrations = campaigns.reduce(
    (sum, c) => sum + c.registrationCount,
    0
  )
  
  // Calculate total allocated capacity from campaign limits
  const allocatedCapacity = campaigns.reduce(
    (sum, c) => sum + (c.capacityLimit || 0),
    0
  )
  
  const availableCapacity = eventCapacity 
    ? Math.max(0, eventCapacity - allocatedCapacity)
    : Infinity

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalCampaignRegistrations,
    availableCapacity: availableCapacity === Infinity ? 0 : availableCapacity
  }
}

/**
 * Validate campaign capacity against event limits
 */
export function validateCampaignCapacity(
  newCapacity: number,
  currentCampaignCapacity: number,
  otherCampaignsCapacity: number,
  eventCapacity?: number
): { isValid: boolean; message?: string } {
  if (!eventCapacity) {
    return { isValid: true }
  }

  const totalAllocated = otherCampaignsCapacity + newCapacity
  
  if (totalAllocated > eventCapacity) {
    const available = eventCapacity - otherCampaignsCapacity
    return {
      isValid: false,
      message: `Capacity exceeds event limit. Maximum available: ${available}`
    }
  }

  return { isValid: true }
}
