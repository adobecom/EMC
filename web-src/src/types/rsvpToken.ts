/*
* <license header>
*/

/**
 * RSVP token type definitions aligned with the ESP API contract.
 *
 * An RSVP token lets an Event Marketer generate a one-time-use token that
 * bypasses Adobe ID login, for VIP/on-behalf-of registrations or to unblock
 * users hitting Adobe ID account issues. The token is consumed on successful
 * registration (public POST /v1/events/{eventId}/rsvpTokenRegistrations in
 * event-libs, authenticated via the x-adobe-esp-rsvp-token header).
 *
 * ESP never returns a composed URL — only the raw token. EMC builds the
 * shareable link client-side as `${event.detailPagePath}?rsvpToken=${token}`.
 *
 * Campaign attribution is intentionally NOT modeled on the token itself —
 * EMC never binds a campaign at generation time. Instead, when a marketer
 * shares a link, an optional campaign is tracked via a separate `campaign`
 * query param on the composed URL (see GuestRsvpUrlsTab's copy flow), which
 * event-libs forwards to the guest submit endpoint's `campaignId` query-param
 * fallback at registration time. Token and campaign are fully independent.
 *
 * API base: POST/GET/PATCH/DELETE /v1/events/{eventId}/rsvpTokens[/{token}]
 */

export type RsvpTokenStatus = 'unused' | 'used' | 'revoked'

/**
 * RsvpToken response object returned by the API.
 */
export interface RsvpToken {
  token: string
  eventId: string
  status: RsvpTokenStatus
  isExpired: boolean
  createdBy: string
  creationTime: number
  modificationTime: number
  expiresAt?: number
  usedAt?: number
  usedByAttendee?: string
  revokedAt?: number
  revokedBy?: string
  /** Client-composed shareable link (`${event.detailPagePath}?rsvpToken=${token}`); not returned by the API. */
  url?: string
}

/**
 * Payload for POST /v1/events/{eventId}/rsvpTokens
 */
export interface RsvpTokenCreatePayload {
  expiresInDays?: number
}

/**
 * Payload for PATCH /v1/events/{eventId}/rsvpTokens/{token} — extends an
 * unused token's expiry by a relative number of days (server recomputes
 * expiresAt as now + expiresInDays, replacing the prior value). Only unused
 * tokens can be patched.
 */
export interface RsvpTokenUpdatePayload {
  expiresInDays: number
}

/**
 * Dashboard statistics derived from an RSVP token list.
 */
export interface RsvpTokenStats {
  totalTokens: number
  unusedTokens: number
  usedTokens: number
}

/**
 * Calculate RSVP token statistics for the stats bar.
 */
export function calculateRsvpTokenStats(tokens: RsvpToken[]): RsvpTokenStats {
  const unusedTokens = tokens.filter(t => t.status === 'unused')
  const usedTokens = tokens.filter(t => t.status === 'used')

  return {
    totalTokens: tokens.length,
    unusedTokens: unusedTokens.length,
    usedTokens: usedTokens.length,
  }
}
