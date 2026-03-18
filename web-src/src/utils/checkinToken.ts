/*
* <license header>
*/

export interface CheckinTokenData {
  eventId: string
  attendeeId: string
}

/**
 * Parse a base64-encoded check-in token into eventId and attendeeId.
 * Token format: base64("<eventId>:<attendeeId>")
 */
export function parseCheckinToken(token: string): CheckinTokenData | null {
  try {
    const decoded = atob(token)
    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex === -1) return null

    const eventId = decoded.substring(0, separatorIndex)
    const attendeeId = decoded.substring(separatorIndex + 1)

    if (!eventId || !attendeeId) return null

    return { eventId, attendeeId }
  } catch {
    return null
  }
}

/**
 * Create a base64-encoded check-in token from eventId and attendeeId.
 * Convenience for generating test/QR URLs.
 */
export function createCheckinToken(eventId: string, attendeeId: string): string {
  return btoa(`${eventId}:${attendeeId}`)
}
