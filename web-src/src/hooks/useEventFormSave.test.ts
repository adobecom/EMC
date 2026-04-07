/**
 * Tests for event payload field exclusions.
 *
 * The generic loop in buildEventPayload (useEventFormSave) iterates
 * EVENT_DATA_FILTER and includes every submittable field that is not
 * in speciallyHandledFields. These tests verify guards on automatic payload building:
 *
 * 1. detailPagePath — submittable: false in EVENT_DATA_FILTER; EventForm merges it via
 *    extraPayload rather than the generic payload loop.
 * 2. inviteOnly — in speciallyHandledFields (tested indirectly via filterEventData)
 */

import {
  EVENT_DATA_FILTER,
  filterEventData,
  isValidAttribute,
  prepareEslEventPutPayload,
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

describe('prepareEslEventPutPayload (ESL PUT egress)', () => {
  it('drops inviteOnly by default', () => {
    const result = prepareEslEventPutPayload({
      cloudType: 'CreativeCloud',
      seriesId: 's1',
      inviteOnly: true,
      enTitle: 'T',
    })
    expect(result).not.toHaveProperty('inviteOnly')
    expect(result.enTitle).toBe('T')
  })

  it('sends detailPagePath on PUT when the title is changed', () => {
    const url = 'https://www.adobe.com/events/updated-title/overview'
    const result = prepareEslEventPutPayload({
      cloudType: 'CreativeCloud',
      seriesId: 's1',
      detailPagePath: url,
      enTitle: 'Updated Title',
    })

    expect(result.detailPagePath).toBe(url)
    expect(result.enTitle).toBe('Updated Title')
  })

  it('does not send detailPagePath on PUT when the title is unchanged and no extra payload is provided', () => {
    const result = prepareEslEventPutPayload({
      eventId: 'evt-456',
      cloudType: 'CreativeCloud',
      seriesId: 's1',
      enTitle: 'Existing Title',
    })

    expect(result).not.toHaveProperty('detailPagePath')
  })

  it('does not add detailPagePath when missing or empty', () => {
    expect(prepareEslEventPutPayload({ cloudType: 'CreativeCloud', seriesId: 's1' })).not.toHaveProperty(
      'detailPagePath'
    )
    expect(
      prepareEslEventPutPayload({ cloudType: 'CreativeCloud', seriesId: 's1', detailPagePath: '' })
    ).not.toHaveProperty('detailPagePath')
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
