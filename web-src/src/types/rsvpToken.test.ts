import { getRemainingDays, DEFAULT_EXTEND_DAYS } from './rsvpToken'
import type { RsvpToken } from './rsvpToken'

// Pins the fix for a regression the "Update Link" dialog would otherwise reintroduce:
// editing only the label (not the expiry) must not silently reset a link's validity
// to DEFAULT_EXTEND_DAYS, since the BE requires expiresInDays on every PATCH and
// always recomputes expiresAt from whatever value is submitted.
describe('getRemainingDays', () => {
  const baseLink: RsvpToken = {
    token: 'abc',
    eventId: 'evt-1',
    status: 'unused',
    isExpired: false,
    createdBy: 'someone@adobe.com',
    creationTime: Date.now(),
    modificationTime: Date.now(),
  }

  it('falls back to the default when the link has no expiresAt', () => {
    expect(getRemainingDays(baseLink)).toBe(DEFAULT_EXTEND_DAYS)
  })

  it("rounds up the link's actual remaining validity", () => {
    const link = { ...baseLink, expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000 }
    expect(getRemainingDays(link)).toBe(60)
  })

  it('clamps an already-past expiresAt to a minimum of 1 (NumberField requires minValue=1)', () => {
    const link = { ...baseLink, expiresAt: Date.now() - 24 * 60 * 60 * 1000 }
    expect(getRemainingDays(link)).toBe(1)
  })
})
