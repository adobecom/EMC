/*
* <license header>
*/

/**
 * Guest RSVP token type definitions aligned with the ESP API contract.
 *
 * A guest RSVP token lets an Event Marketer generate a one-time-use token that
 * bypasses Adobe ID login, for VIP/on-behalf-of registrations or to unblock
 * users hitting Adobe ID account issues. The token is consumed on successful
 * registration (public POST /v1/events/{eventId}/guestRsvpAttendees in
 * event-libs, authenticated via the x-adobe-esp-guest-token header).
 *
 * ESP never returns a composed URL — only the raw token. EMC builds the
 * shareable link client-side as `${event.detailPagePath}?guestToken=${token}`.
 *
 * API base: POST/GET/PATCH/DELETE /v1/events/{eventId}/guestRsvpTokens[/{token}]
 */

export type GuestRsvpTokenStatus = 'unused' | 'used' | 'revoked'

/**
 * GuestRsvpToken response object returned by the API.
 */
export interface GuestRsvpToken {
  token: string
  eventId: string
  campaignId?: string
  status: GuestRsvpTokenStatus
  isExpired: boolean
  createdBy: string
  createdAt: number
  expiresAt?: number
  usedAt?: number
  usedByAttendeeId?: string
  /** Client-composed shareable link (`${event.detailPagePath}?guestToken=${token}`); not returned by the API. */
  url?: string
}

/**
 * Payload for POST /v1/events/{eventId}/guestRsvpTokens
 */
export interface GuestRsvpTokenCreatePayload {
  campaignId?: string
  expiresInDays?: number
}

/**
 * Payload for PATCH /v1/events/{eventId}/guestRsvpTokens/{token} — extends an
 * unused token's expiry by a relative number of days (server recomputes
 * expiresAt as now + expiresInDays, replacing the prior value). Only unused
 * tokens can be patched.
 */
export interface GuestRsvpTokenUpdatePayload {
  expiresInDays: number
}

/**
 * Dashboard statistics derived from a guest RSVP token list.
 */
export interface GuestRsvpTokenStats {
  totalTokens: number
  unusedTokens: number
  usedTokens: number
}

/**
 * Calculate guest RSVP token statistics for the stats bar.
 */
export function calculateGuestRsvpTokenStats(tokens: GuestRsvpToken[]): GuestRsvpTokenStats {
  const unusedTokens = tokens.filter(t => t.status === 'unused')
  const usedTokens = tokens.filter(t => t.status === 'used')

  return {
    totalTokens: tokens.length,
    unusedTokens: unusedTokens.length,
    usedTokens: usedTokens.length,
  }
}
