/*
* <license header>
*/

/**
 * Guest RSVP link type definitions aligned with the ESP API contract.
 *
 * A guest RSVP link lets an Event Marketer generate a one-time-use link that
 * bypasses Adobe ID login, for VIP/on-behalf-of registrations or to unblock
 * users hitting Adobe ID account issues. The link is consumed on successful
 * registration (public POST /v1/guestRsvpLinks/{token}/redeem in event-libs).
 *
 * API base: POST/GET/PATCH/DELETE /v1/events/{eventId}/guestRsvpLinks[/{token}]
 */

export type GuestRsvpLinkStatus = 'unused' | 'redeemed' | 'expired' | 'revoked'

/**
 * GuestRsvpLink response object returned by the API.
 */
export interface GuestRsvpLink {
  token: string
  url: string
  status: GuestRsvpLinkStatus
  eventId: string
  createdBy: string
  creationTime: number
  expirationTime?: number
  redeemedBy?: string
  redemptionTime?: number
}

/**
 * Payload for POST /v1/events/{eventId}/guestRsvpLinks
 */
export interface GuestRsvpLinkCreatePayload {
  expirationTime?: number
}

/**
 * Payload for PATCH /v1/events/{eventId}/guestRsvpLinks/{token} — extends or
 * otherwise modifies an unused link's TTL. Only unused links can be patched.
 */
export interface GuestRsvpLinkUpdatePayload {
  expirationTime: number
}

/**
 * Wrapper returned by GET /v1/events/{eventId}/guestRsvpLinks
 */
export interface GuestRsvpLinkListResponse {
  guestRsvpLinks: GuestRsvpLink[]
}

/**
 * Dashboard statistics derived from a guest RSVP link list.
 */
export interface GuestRsvpLinkStats {
  totalLinks: number
  unusedLinks: number
  redeemedLinks: number
}

/**
 * Calculate guest RSVP link statistics for the stats bar.
 */
export function calculateGuestRsvpLinkStats(links: GuestRsvpLink[]): GuestRsvpLinkStats {
  const unusedLinks = links.filter(l => l.status === 'unused')
  const redeemedLinks = links.filter(l => l.status === 'redeemed')

  return {
    totalLinks: links.length,
    unusedLinks: unusedLinks.length,
    redeemedLinks: redeemedLinks.length,
  }
}
