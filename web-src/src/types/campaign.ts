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
}

/**
 * Calculate campaign statistics for the stats bar.
 */
export function calculateCampaignStats(campaigns: Campaign[]): CampaignStats {
  const activeCampaigns = campaigns.filter(c => c.status === 'Active')
  const totalRegistrations = campaigns.reduce(
    (sum, c) => sum + c.attendeeCount,
    0
  )
  const totalWaitlisted = campaigns.reduce(
    (sum, c) => sum + c.waitlistAttendeeCount,
    0
  )

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    totalRegistrations,
    totalWaitlisted,
  }
}
