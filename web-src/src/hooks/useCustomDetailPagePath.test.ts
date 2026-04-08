import type { EventApiResponse } from '../types/domain'
import { findDetailPagePathCollisionEvent } from './useCustomDetailPagePath'

describe('findDetailPagePathCollisionEvent', () => {
  const url = 'https://example.com/de/events/foo/overview'

  it('returns null when the only match is the excluded event', () => {
    const events: EventApiResponse[] = [
      { eventId: 'self', published: false, detailPagePath: url },
    ]
    expect(findDetailPagePathCollisionEvent(events, url, 'self')).toBeNull()
  })

  it('still collides when another event has the same path', () => {
    const other: EventApiResponse = {
      eventId: 'other',
      published: false,
      detailPagePath: url,
    }
    const events: EventApiResponse[] = [
      { eventId: 'self', published: false, detailPagePath: url },
      other,
    ]
    expect(findDetailPagePathCollisionEvent(events, url, 'self')).toBe(other)
  })

  it('without excludeEventId, matches any event including self', () => {
    const self: EventApiResponse = { eventId: 'self', published: false, detailPagePath: url }
    expect(findDetailPagePathCollisionEvent([self], url)).toBe(self)
  })
})
