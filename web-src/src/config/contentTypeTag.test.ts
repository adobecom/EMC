import { resolveContentTypeTag } from './contentTypeTag'
import { CONTENT_TYPE_TAGS, CONTENT_TYPE_TAG_FALLBACK, EVENT_TYPES } from './constants'

// Pins OUR copy of the backend's EVENT_TYPE_CONTENT_TAG_MAP. Nothing here can reach that
// repo, so these catch an accidental edit on this side only — not backend drift.
describe('content-type tag values mirror the backend map', () => {
  it('pins the InPerson tag', () => {
    expect(CONTENT_TYPE_TAGS[EVENT_TYPES.IN_PERSON].caasId).toBe('caas:content-type/in-person-event')
  })

  it('pins the Webinar tag', () => {
    expect(CONTENT_TYPE_TAGS[EVENT_TYPES.WEBINAR].caasId).toBe('caas:content-type/webinar')
  })

  it('pins the fallback tag', () => {
    expect(CONTENT_TYPE_TAG_FALLBACK.caasId).toBe('caas:content-type/event')
  })

  it('has no Hybrid entry, matching the backend map', () => {
    expect(CONTENT_TYPE_TAGS).not.toHaveProperty(EVENT_TYPES.HYBRID)
  })
})

describe('resolveContentTypeTag — derived from event type', () => {
  it('maps in-person to the in-person-event tag', () => {
    const result = resolveContentTypeTag('in-person')
    expect(result.caasId).toBe('caas:content-type/in-person-event')
    expect(result.title).toBe('In-Person Event')
    expect(result.isFallback).toBe(false)
  })

  it('maps webinar to the webinar tag', () => {
    const result = resolveContentTypeTag('webinar')
    expect(result.caasId).toBe('caas:content-type/webinar')
    expect(result.title).toBe('Webinar')
    expect(result.isFallback).toBe(false)
  })

  it('tolerates casing and surrounding whitespace', () => {
    expect(resolveContentTypeTag(' Webinar ').caasId).toBe('caas:content-type/webinar')
    expect(resolveContentTypeTag('In-Person').caasId).toBe('caas:content-type/in-person-event')
  })

  it('accepts the API PascalCase eventType as well as the form kebab-case', () => {
    // mapApiResponseToFormData lowercases eventType, but the raw API value is
    // 'InPerson'/'Webinar' and reaches this code via other paths.
    expect(resolveContentTypeTag('InPerson').caasId).toBe('caas:content-type/in-person-event')
    expect(resolveContentTypeTag('Webinar').caasId).toBe('caas:content-type/webinar')
  })

  it('returns a formatLabel that agrees with the resolved tag', () => {
    expect(resolveContentTypeTag('webinar').formatLabel).toBe('Webinar')
    expect(resolveContentTypeTag('in-person').formatLabel).toBe('In-person')
    // Normalized input must not produce a label that contradicts the tag
    expect(resolveContentTypeTag(' WEBINAR ').formatLabel).toBe('Webinar')
  })

  it('omits formatLabel when the fallback applies', () => {
    expect(resolveContentTypeTag('hybrid').formatLabel).toBeUndefined()
    expect(resolveContentTypeTag(undefined).formatLabel).toBeUndefined()
  })
})

describe('resolveContentTypeTag — fallback', () => {
  it('falls back for hybrid, which the backend map also omits', () => {
    const result = resolveContentTypeTag('hybrid')
    expect(result.caasId).toBe('caas:content-type/event')
    expect(result.isFallback).toBe(true)
  })

  it.each([undefined, null, '', '   ', 'something-else'])('falls back for %p', (eventType) => {
    const result = resolveContentTypeTag(eventType as string | undefined | null)
    expect(result.caasId).toBe('caas:content-type/event')
    expect(result.isFallback).toBe(true)
  })
})

describe('resolveContentTypeTag — manual content-type tag on the event', () => {
  // The backend sets contentType purely from eventType; only `tags` honors an explicit
  // tag. Reporting the manual tag as the content type would misstate what happens.
  it('still reports the derived tag, because the backend always sets contentType from eventType', () => {
    const result = resolveContentTypeTag('in-person', [
      { name: 'Webinar', caasId: 'caas:content-type/webinar' },
    ])
    expect(result.caasId).toBe('caas:content-type/in-person-event')
    expect(result.title).toBe('In-Person Event')
    expect(result.formatLabel).toBe('In-person')
    expect(result.isFallback).toBe(false)
  })

  it('reports the derived tag even when the manual tag is listed first', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Article', caasId: 'caas:content-type/article' },
      { name: 'Tier 3', caasId: 'caas:events/type/tier-3' },
    ])
    expect(result.caasId).toBe('caas:content-type/webinar')
    expect(result.manualOverride?.caasId).toBe('caas:content-type/article')
  })

  // A manual tag REPLACES the derived tag in the CaaS tags array rather than coexisting
  // with it; earlier UI copy claimed both appear, which was false. Pins the shape that
  // copy depends on.
  it('names the manual tag separately from the reported tag, so the UI can say it replaces it', () => {
    const result = resolveContentTypeTag('in-person', [
      { name: 'Webinar', caasId: 'caas:content-type/webinar' },
    ])
    expect(result.caasId).toBe('caas:content-type/in-person-event')
    expect(result.manualOverride?.caasId).toBe('caas:content-type/webinar')
    expect(result.manualOverride?.caasId).not.toBe(result.caasId)
  })

  it('picks the first content-type tag when several conflict', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Article', caasId: 'caas:content-type/article' },
      { name: 'Blog', caasId: 'caas:content-type/blog' },
    ])
    // Matches buildXdmTags, which also takes the first match via Array.prototype.find
    expect(result.manualOverride?.caasId).toBe('caas:content-type/article')
    expect(result.caasId).toBe('caas:content-type/webinar')
  })

  it('surfaces the conflicting tag as a manual override', () => {
    const result = resolveContentTypeTag('in-person', [
      { name: 'Webinar', caasId: 'caas:content-type/webinar' },
    ])
    expect(result.manualOverride).toEqual({
      title: 'Webinar',
      caasId: 'caas:content-type/webinar',
    })
  })

  it('reports no override when the manual tag already equals the derived tag', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Webinar', caasId: 'caas:content-type/webinar' },
    ])
    expect(result.manualOverride).toBeUndefined()
  })

  it('titles an unknown content-type tag from its path segment', () => {
    const result = resolveContentTypeTag('in-person', [
      { name: 'caas:content-type/white-paper', caasId: 'caas:content-type/white-paper' },
    ])
    expect(result.manualOverride?.title).toBe('White Paper')
  })

  it('prefers a taxonomy-resolved name over the path segment', () => {
    const result = resolveContentTypeTag('in-person', [
      { name: 'Analyst Reports', caasId: 'caas:content-type/analyst-reports' },
    ])
    expect(result.manualOverride?.title).toBe('Analyst Reports')
  })
})

describe('resolveContentTypeTag — tag namespace matching', () => {
  it('ignores unrelated caas tags', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Tier 3', caasId: 'caas:events/type/tier-3' },
      { name: 'View Event', caasId: 'caas:cta/view-event' },
      { name: 'Create Now', caasId: 'caas:events/series/create-now' },
    ])
    expect(result.caasId).toBe('caas:content-type/webinar')
    expect(result.manualOverride).toBeUndefined()
  })

  it('ignores the bare namespace with no child segment', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Content Type', caasId: 'caas:content-type/' },
    ])
    expect(result.manualOverride).toBeUndefined()
  })

  it('does not treat a lookalike namespace as a content-type tag', () => {
    const result = resolveContentTypeTag('webinar', [
      { name: 'Nope', caasId: 'caas:content-typeface/serif' },
    ])
    expect(result.manualOverride).toBeUndefined()
  })

  it('tolerates tags with no caasId', () => {
    const result = resolveContentTypeTag('webinar', [{ name: 'Freeform' } as never])
    expect(result.caasId).toBe('caas:content-type/webinar')
    expect(result.manualOverride).toBeUndefined()
  })
})
