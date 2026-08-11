import {
  handleExtension,
  getRelativeEventPagePath,
  constructFragmentsFolderPath,
  getLocalizedTemplatePath,
} from './paths'

describe('handleExtension', () => {
  it('strips .docx extension', () => {
    expect(handleExtension('/events/my-event.docx')).toBe('/events/my-event')
  })

  it('replaces .xlsx with .json', () => {
    expect(handleExtension('/data/sheet.xlsx')).toBe('/data/sheet.json')
  })

  it('treats index.docx as empty filename (folder index)', () => {
    // index.docx → lower-cased → 'index.docx' → fn='' → path ends with trailing slash
    expect(handleExtension('/events/index.docx')).toBe('/events/')
  })

  it('lowercases and normalizes the filename', () => {
    expect(handleExtension('/events/My Event.docx')).toBe('/events/my-event')
  })

  it('strips leading and trailing hyphens from filename', () => {
    expect(handleExtension('/events/-event-.docx')).toBe('/events/event')
  })
})

describe('constructFragmentsFolderPath', () => {
  it('derives fragment folder from a simple event path', () => {
    // /events/my-event → /events/fragments/my-event
    expect(constructFragmentsFolderPath('/events/my-event')).toBe('/events/fragments/my-event')
  })

  it('handles deeper paths', () => {
    // /en/events/summit → /en/events/fragments/summit
    expect(constructFragmentsFolderPath('/en/events/summit')).toBe('/en/events/fragments/summit')
  })

  it('handles a path with no leading slash', () => {
    expect(constructFragmentsFolderPath('events/my-event')).toBe('events/fragments/my-event')
  })
})

describe('getLocalizedTemplatePath', () => {
  it('returns original path unchanged when no localeFolder', () => {
    const path = '/event-libs/event-libs/assets/templates/base'
    expect(getLocalizedTemplatePath(path, '')).toBe(path)
  })

  it('inserts locale folder after the first segment', () => {
    const path = '/event-libs/event-libs/assets/templates/base'
    // Should become /event-libs/fr/event-libs/assets/templates/base
    expect(getLocalizedTemplatePath(path, 'fr')).toBe('/event-libs/fr/event-libs/assets/templates/base')
  })

  it('inserts locale folder after the first segment for uk locale', () => {
    const path = '/event-libs/event-libs/assets/templates/base'
    expect(getLocalizedTemplatePath(path, 'uk')).toBe('/event-libs/uk/event-libs/assets/templates/base')
  })

  it('throws when template path does not start with /', () => {
    expect(() => getLocalizedTemplatePath('event-libs/base', 'fr')).toThrow()
  })
})

describe('getRelativeEventPagePath', () => {
  const defaultLocale = 'en-US'
  const localeFolderMap: Record<string, string> = {
    'en-US': '',
    'fr-FR': 'fr',
    'en-GB': 'uk',
  }

  it('returns relative path for default locale event', () => {
    const eventData = {
      detailPagePath: 'https://example.com/events/my-summit',
      defaultLocale,
      locale: 'en-US',
      localeFolder: '',
      series: { contentRoot: '/events/' },
    }
    const result = getRelativeEventPagePath(eventData, localeFolderMap)
    expect(result).toBe('/events/my-summit')
  })

  it('returns null when detailPagePath is missing', () => {
    const eventData = {
      detailPagePath: '',
      defaultLocale,
      locale: 'en-US',
      localeFolder: '',
      series: { contentRoot: '/events/' },
    }
    expect(getRelativeEventPagePath(eventData, localeFolderMap)).toBeNull()
  })

  it('includes locale folder prefix for non-default locale', () => {
    const eventData = {
      detailPagePath: 'https://example.com/events/my-summit',
      defaultLocale,
      locale: 'fr-FR',
      localeFolder: 'fr',
      series: { contentRoot: '/events/' },
    }
    const result = getRelativeEventPagePath(eventData, localeFolderMap)
    expect(result).toContain('/fr/')
    expect(result).toContain('my-summit')
  })
})
