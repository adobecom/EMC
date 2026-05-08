import type { EventApiResponse } from '../types/domain'
import {
  slugify,
  normalizeRelativeUrl,
  resolveUrlPattern,
  constructDetailPagePath,
  extractUrlPatternTokens,
  patternTokensAffectingUrlChanged,
} from './urlPatternResolver'

describe('normalizeRelativeUrl', () => {
  it('strips leading slashes', () => {
    expect(normalizeRelativeUrl('/foo/bar')).toBe('foo/bar')
  })

  it('strips trailing slashes', () => {
    expect(normalizeRelativeUrl('foo/bar/')).toBe('foo/bar')
  })

  it('removes characters outside [a-z0-9\\-\\/]', () => {
    expect(normalizeRelativeUrl('overview.html')).toBe('overviewhtml')
  })

  it('passes through already-valid segments unchanged', () => {
    expect(normalizeRelativeUrl('my-event/overview')).toBe('my-event/overview')
  })

  it('collapses duplicate slashes', () => {
    expect(normalizeRelativeUrl('foo//bar')).toBe('foo/bar')
  })

  it('passes through a simple slug unchanged', () => {
    expect(normalizeRelativeUrl('my-event-title')).toBe('my-event-title')
  })

  it('handles empty string', () => {
    expect(normalizeRelativeUrl('')).toBe('')
  })

  it('handles leading slash with content', () => {
    expect(normalizeRelativeUrl('/my-event')).toBe('my-event')
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('strips non-ASCII characters', () => {
    expect(slugify('café')).toBe('caf')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('hello--world')).toBe('hello-world')
  })

  it('trims whitespace before slugifying', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })
})

describe('resolveUrlPattern', () => {
  it('replaces a single token with its slugified value', () => {
    expect(resolveUrlPattern('{enTitle}', { enTitle: 'My Event' })).toBe('my-event')
  })

  it('replaces multiple tokens', () => {
    expect(
      resolveUrlPattern('{enTitle}/{localStartDate}', {
        enTitle: 'My Event',
        localStartDate: '2026-03-25',
      })
    ).toBe('my-event/2026-03-25')
  })

  it('leaves unresolved tokens when key is missing from context', () => {
    expect(
      resolveUrlPattern('{enTitle}/{missing}', { enTitle: 'My Event' })
    ).toBe('my-event/{missing}')
  })

  it('leaves token as-is when its value is an empty string', () => {
    expect(resolveUrlPattern('{enTitle}', { enTitle: '' })).toBe('{enTitle}')
  })
})

describe('constructDetailPagePath', () => {
  it('joins domain, root, and pattern into a full path', () => {
    expect(
      constructDetailPagePath('https://www.adobe.com', 'events', 'my-event/overview')
    ).toBe('https://www.adobe.com/events/my-event/overview')
  })

  it('normalizes trailing slash on domain', () => {
    expect(
      constructDetailPagePath('https://www.adobe.com/', 'events', 'my-event/overview')
    ).toBe('https://www.adobe.com/events/my-event/overview')
  })

  it('normalizes leading slash on content root', () => {
    expect(
      constructDetailPagePath('https://www.adobe.com', '/events', 'my-event/overview')
    ).toBe('https://www.adobe.com/events/my-event/overview')
  })

  it('handles empty segments by filtering them out', () => {
    expect(
      constructDetailPagePath('', '', 'my-event')
    ).toBe('my-event')
  })

  it('prefixes https when relatedDomain has host but no scheme', () => {
    expect(
      constructDetailPagePath('www.adobe.com', '/events', 'my-event/overview')
    ).toBe('https://www.adobe.com/events/my-event/overview')
  })

  it('inserts locale prefix between domain and content root', () => {
    expect(
      constructDetailPagePath(
        'https://www.adobe.com',
        'events',
        'my-event/overview',
        'de'
      )
    ).toBe('https://www.adobe.com/de/events/my-event/overview')
  })

  it('normalizes slashes on locale prefix', () => {
    expect(
      constructDetailPagePath(
        'https://www.adobe.com',
        '/events',
        'slug/overview',
        '/ca_fr/'
      )
    ).toBe('https://www.adobe.com/ca_fr/events/slug/overview')
  })
})

describe('extractUrlPatternTokens', () => {
  it('returns distinct tokens in order of first appearance', () => {
    expect(extractUrlPatternTokens('{enTitle}/{localStartDate}')).toEqual([
      'enTitle',
      'localStartDate',
    ])
  })

  it('dedupes repeated tokens', () => {
    expect(extractUrlPatternTokens('{enTitle}/x/{enTitle}')).toEqual(['enTitle'])
  })

  it('returns empty array when no placeholders', () => {
    expect(extractUrlPatternTokens('static/path')).toEqual([])
  })
})

function baseSavedEvent(over: Partial<EventApiResponse> = {}): EventApiResponse {
  return {
    eventId: 'evt-1',
    published: false,
    enTitle: 'Saved Title',
    seriesId: 'series-a',
    cloudType: 'CreativeCloud',
    eventType: 'InPerson',
    localStartDate: '2026-01-15',
    defaultLocale: 'en-US',
    localizations: { 'en-US': { title: 'Saved Title' } },
    ...over,
  }
}

describe('patternTokensAffectingUrlChanged', () => {
  const formBase = {
    cloudType: 'CreativeCloud' as const,
    eventType: 'in-person' as const,
    seriesId: 'series-a',
    name: 'Saved Title',
    enTitle: 'Saved Title',
    startDateTime: '2026-01-15T09:00',
    defaultLocale: 'en-US',
    language: 'en',
    isPrivate: false,
    inviteOnly: false,
    organizationId: '',
    status: 'draft' as const,
    registrationOpen: false,
  }

  it('returns false for {enTitle} when title inputs match saved', () => {
    expect(
      patternTokensAffectingUrlChanged('{enTitle}', formBase as any, baseSavedEvent())
    ).toBe(false)
  })

  it('returns true for {enTitle} when effective title changes (enTitle field)', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{enTitle}',
        { ...formBase, enTitle: 'New Title', name: 'Saved Title' } as any,
        baseSavedEvent()
      )
    ).toBe(true)
  })

  it('returns true for {enTitle} when only localized name changes and enTitle is empty', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{enTitle}',
        { ...formBase, enTitle: '', name: 'Neuer Titel' } as any,
        baseSavedEvent()
      )
    ).toBe(true)
  })

  it('returns true when defaultLocale changes (locale prefix)', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{enTitle}',
        { ...formBase, defaultLocale: 'de-DE' } as any,
        baseSavedEvent()
      )
    ).toBe(true)
  })

  it('returns false for {localStartDate} when date unchanged', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{localStartDate}',
        formBase as any,
        baseSavedEvent()
      )
    ).toBe(false)
  })

  it('returns true for {localStartDate} when date changes', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{localStartDate}',
        { ...formBase, startDateTime: '2026-02-01T09:00' } as any,
        baseSavedEvent()
      )
    ).toBe(true)
  })

  it('returns true for unknown token (conservative)', () => {
    expect(
      patternTokensAffectingUrlChanged(
        '{futureToken}',
        formBase as any,
        baseSavedEvent()
      )
    ).toBe(true)
  })

  it('returns false for static pattern when locale unchanged', () => {
    expect(
      patternTokensAffectingUrlChanged('static-segment', formBase as any, baseSavedEvent())
    ).toBe(false)
  })
})
