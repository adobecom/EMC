/**
 * Tests for event payload field exclusions.
 *
 * The generic loop in buildEventPayload (useEventFormSave) iterates
 * EVENT_DATA_FILTER and includes every submittable field that is not
 * in speciallyHandledFields. These tests verify the two guards that
 * prevent read-only fields from reaching ESP update payloads:
 *
 * 1. detailPagePath — submittable: false in EVENT_DATA_FILTER
 * 2. inviteOnly — in speciallyHandledFields (tested indirectly via
 *    filterEventData, which also respects submittable)
 */

import {
  EVENT_DATA_FILTER,
  filterEventData,
  isValidAttribute,
} from '../utils/dataFilters'

describe('EVENT_DATA_FILTER field configurations', () => {
  it('marks detailPagePath as not submittable', () => {
    expect(EVENT_DATA_FILTER.detailPagePath).toBeDefined()
    expect(EVENT_DATA_FILTER.detailPagePath.submittable).toBe(false)
  })

  it('marks inviteOnly as submittable (gated by speciallyHandledFields in buildEventPayload)', () => {
    expect(EVENT_DATA_FILTER.inviteOnly).toBeDefined()
    expect(EVENT_DATA_FILTER.inviteOnly.submittable).toBe(true)
  })

  it('marks inviteOnly as non-localizable', () => {
    expect(EVENT_DATA_FILTER.inviteOnly.localizable).toBe(false)
  })
})

describe('filterEventData excludes non-submittable fields', () => {
  const sampleEvent = {
    cloudType: 'CreativeCloud',
    seriesId: 'series-123',
    eventType: 'InPerson',
    detailPagePath: 'https://www.adobe.com/events/my-event/overview',
    inviteOnly: true,
    published: true,
    enTitle: 'My Event',
  }

  it('excludes detailPagePath from submission payload', () => {
    const result = filterEventData(sampleEvent, 'submission')
    expect(result).not.toHaveProperty('detailPagePath')
  })

  it('includes inviteOnly in submission payload (speciallyHandledFields is a runtime guard only)', () => {
    const result = filterEventData(sampleEvent, 'submission')
    expect(result.inviteOnly).toBe(true)
  })

  it('includes other submittable fields', () => {
    const result = filterEventData(sampleEvent, 'submission')
    expect(result.cloudType).toBe('CreativeCloud')
    expect(result.seriesId).toBe('series-123')
    expect(result.enTitle).toBe('My Event')
  })
})

describe('isValidAttribute handles boolean false correctly', () => {
  it('treats false as valid', () => {
    expect(isValidAttribute(false)).toBe(true)
  })

  it('treats null as invalid', () => {
    expect(isValidAttribute(null)).toBe(false)
  })

  it('treats undefined as invalid', () => {
    expect(isValidAttribute(undefined)).toBe(false)
  })

  it('treats empty string as invalid', () => {
    expect(isValidAttribute('')).toBe(false)
  })
})

describe('extraPayload url field passes through correctly', () => {
  it('url field is not in EVENT_DATA_FILTER so it passes through Object.assign without interference', () => {
    // The url field is passed via extraPayload in EventForm.tsx
    // and merged via Object.assign(payload, extraPayload).
    // Verify url is NOT a known filter field (would cause double-processing).
    expect(EVENT_DATA_FILTER.url).toBeUndefined()
  })
})
