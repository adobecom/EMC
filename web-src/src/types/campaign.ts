/* 
* <license header>
*/

/**
 * Campaign type definitions aligned with the ESP API contract.
 *
 * API base: POST/GET/PUT/DELETE /v1/events/{eventId}/campaigns[/{campaignId}]
 */

export type CampaignStatus = 'Active' | 'Archived'

/**
 * EventCampaign response object returned by the API.
 */
export interface Campaign {
  campaignId: string
  name: string
  status: CampaignStatus
  attendeeLimit: number
  attendeeCount: number
  waitlistAttendeeCount: number
  url: string
  creationTime: number
  modificationTime: number
}

/**
 * Payload for POST /v1/events/{eventId}/campaigns
 */
export interface CampaignCreatePayload {
  name: string
  status?: CampaignStatus
  attendeeLimit?: number
}

/**
 * Payload for PUT /v1/events/{eventId}/campaigns/{campaignId}
 *
 * `modificationTime` is required for optimistic concurrency control.
 * Read-only fields (attendeeLimit, attendeeCount, etc.) are stripped
 * server-side.
 */
export interface CampaignUpdatePayload {
  name?: string
  status?: CampaignStatus
  url?: string
  modificationTime: number
}

/**
 * Shape used by the campaign form dialog (create + edit).
 */
export interface CampaignFormData {
  name: string
  attendeeLimit?: number
  status: CampaignStatus
}

/**
 * Wrapper returned by GET /v1/events/{eventId}/campaigns
 */
export interface CampaignListResponse {
  campaigns: Campaign[]
}

/**
 * Dashboard statistics derived from a campaign list.
 */
export interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalRegistrations: number
  totalWaitlisted: number
  availableCapacity: number
}

/**
 * Calculate campaign statistics for the stats bar.
 */
export function calculateCampaignStats(
  campaigns: Campaign[],
  eventCapacity?: number
): CampaignStats {
  const activeCampaigns = campaigns.filter(c => c.status === 'Active')
  const totalRegistrations = campaigns.reduce(
    (sum, c) => sum + c.attendeeCount,
    0
  )
  const totalWaitlisted = campaigns.reduce(
    (sum, c) => sum + c.waitlistAttendeeCount,
    0
  )
  const allocatedCapacity = campaigns.reduce(
    (sum, c) => sum + c.attendeeLimit,
    0
  )

  const availableCapacity = eventCapacity
    ? Math.max(0, eventCapacity - allocatedCapacity)
    : 0

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalRegistrations,
    totalWaitlisted,
    availableCapacity,
  }
}

/**
 * Validate that a proposed attendeeLimit fits within the remaining event
 * capacity (excluding the campaign being edited).
 */
export function validateCampaignCapacity(
  newLimit: number,
  _currentCampaignLimit: number,
  otherCampaignsTotal: number,
  eventCapacity?: number
): { isValid: boolean; message?: string } {
  if (!eventCapacity) {
    return { isValid: true }
  }

  const totalAllocated = otherCampaignsTotal + newLimit

  if (totalAllocated > eventCapacity) {
    const available = eventCapacity - otherCampaignsTotal
    return {
      isValid: false,
      message: `Capacity exceeds event limit. Maximum available: ${available}`,
    }
  }

  return { isValid: true }
}
