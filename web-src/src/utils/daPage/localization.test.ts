import {
  mergeData,
  mergeLocalization,
  removeLocalizationObjects,
  isSameDate,
  extractCustomAttributes,
  fillMissingFields,
} from './localization'

describe('mergeData', () => {
  it('merges scalar localization values into the target', () => {
    const target: any = { title: 'English Title' }
    mergeData(target, { title: 'French Title' }, {})
    expect(target.title).toBe('French Title')
  })

  it('override values take precedence over localization values', () => {
    const target: any = { title: 'English Title' }
    mergeData(target, { title: 'French Title' }, { title: 'Override Title' })
    expect(target.title).toBe('Override Title')
  })

  it('merges nested objects recursively', () => {
    const target: any = { venue: { city: 'SF', country: 'US' } }
    mergeData(target, { venue: { city: 'Paris' } }, {})
    expect(target.venue.city).toBe('Paris')
    expect(target.venue.country).toBe('US')
  })

  it('merges array items by index', () => {
    const target: any = [{ name: 'Alice' }, { name: 'Bob' }]
    mergeData(target, [{ name: 'Alice-FR' }], [])
    expect(target[0].name).toBe('Alice-FR')
    expect(target[1].name).toBe('Bob')
  })
})

describe('removeLocalizationObjects', () => {
  it('removes localizations and localizationOverrides from top-level', () => {
    const data: any = {
      title: 'Event',
      localizations: { 'fr-FR': { title: 'Événement' } },
      localizationOverrides: {},
      speakers: [
        { name: 'Alice', localizations: { 'fr-FR': { name: 'Alise' } } },
      ],
    }
    removeLocalizationObjects(data, ['speakers'])
    expect(data.localizations).toBeUndefined()
    expect(data.localizationOverrides).toBeUndefined()
    expect(data.speakers[0].localizations).toBeUndefined()
  })

  it('handles nested objects (non-array localization keys)', () => {
    const data: any = {
      venue: {
        city: 'SF',
        localizations: { 'fr-FR': { city: 'Paris' } },
        localizationOverrides: {},
      },
    }
    removeLocalizationObjects(data, ['venue'])
    expect(data.venue.localizations).toBeUndefined()
    expect(data.venue.localizationOverrides).toBeUndefined()
    expect(data.venue.city).toBe('SF')
  })
})

describe('mergeLocalization', () => {
  it('merges locale-specific overrides into the event data', () => {
    const data: any = {
      title: 'English Title',
      localizations: {
        'fr-FR': { title: 'Titre Français' },
      },
      speakers: [
        {
          name: 'Alice',
          localizations: { 'fr-FR': { name: 'Alise' } },
        },
      ],
    }
    mergeLocalization(data, 'fr-FR', ['speakers'])
    expect(data.title).toBe('Titre Français')
    expect(data.speakers[0].name).toBe('Alise')
    expect(data.localizations).toBeUndefined()
  })

  it('leaves data unchanged if locale has no override', () => {
    const data: any = {
      title: 'English Title',
      localizations: { 'fr-FR': { title: 'Titre' } },
    }
    mergeLocalization(data, 'de-DE', [])
    expect(data.title).toBe('English Title')
  })
})

describe('isSameDate', () => {
  it('returns true for the same calendar day', () => {
    const d1 = new Date(2025, 5, 15, 9, 0, 0)
    const d2 = new Date(2025, 5, 15, 17, 30, 0)
    expect(isSameDate(d1, d2)).toBe(true)
  })

  it('returns false for different days', () => {
    const d1 = new Date(2025, 5, 15)
    const d2 = new Date(2025, 5, 16)
    expect(isSameDate(d1, d2)).toBe(false)
  })

  it('returns false for same day different months', () => {
    const d1 = new Date(2025, 4, 15)
    const d2 = new Date(2025, 5, 15)
    expect(isSameDate(d1, d2)).toBe(false)
  })
})

describe('extractCustomAttributes', () => {
  it('extracts primaryProductName from customAttributes', () => {
    const eventData = {
      customAttributes: [
        { attribute: 'primaryProductName', value: 'Adobe Analytics' },
        { attribute: 'otherAttr', value: 'something' },
      ],
    }
    const result = extractCustomAttributes(eventData)
    expect(result.primaryProductName).toBe('Adobe Analytics')
  })

  it('extracts promotionalItems sorted by displayOrder', () => {
    const eventData = {
      customAttributes: [
        { attribute: 'promotionalItems', value: 'Promo B', displayOrder: 2 },
        { attribute: 'promotionalItems', value: 'Promo A', displayOrder: 1 },
      ],
    }
    const result = extractCustomAttributes(eventData)
    expect(result.promotionalItems).toEqual(['Promo A', 'Promo B'])
  })

  it('falls back to publishingProfile.metadata when customAttributes is missing', () => {
    const eventData = {
      customAttributes: [],
      publishingProfile: {
        metadata: {
          primaryProductName: 'Adobe Experience Manager',
          promotionalItems: ['Promo 1'],
        },
      },
    }
    const result = extractCustomAttributes(eventData)
    expect(result.primaryProductName).toBe('Adobe Experience Manager')
    expect(result.promotionalItems).toEqual(['Promo 1'])
  })

  it('does not mutate the original eventData object', () => {
    const eventData = {
      customAttributes: [{ attribute: 'primaryProductName', value: 'Adobe Analytics' }],
    }
    const result = extractCustomAttributes(eventData)
    expect(eventData).not.toHaveProperty('primaryProductName')
    expect(result.primaryProductName).toBe('Adobe Analytics')
  })
})

describe('fillMissingFields', () => {
  it('adds photos as empty array when missing', () => {
    const data = { title: 'Event' }
    const result = fillMissingFields(data)
    expect(result.photos).toEqual([])
  })

  it('adds empty series object when missing', () => {
    const data = { title: 'Event' }
    const result = fillMissingFields(data)
    expect(result.series).toEqual({})
  })

  it('adds empty localizations object when missing', () => {
    const data = { title: 'Event' }
    const result = fillMissingFields(data)
    expect(result.localizations).toEqual({})
  })

  it('does not overwrite existing photos', () => {
    const data = { photos: [{ url: 'photo.jpg' }] }
    const result = fillMissingFields(data)
    expect(result.photos).toEqual([{ url: 'photo.jpg' }])
  })
})
