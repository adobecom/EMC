import {
  isPrimitive,
  camelToKebab,
  getMetadata,
  parseRegularPath,
  replacePlaceholders,
  resolveArrayPlaceholders,
  updateFragmentPaths,
} from './placeholders'

describe('isPrimitive', () => {
  it('returns true for null', () => expect(isPrimitive(null)).toBe(true))
  it('returns true for strings', () => expect(isPrimitive('hello')).toBe(true))
  it('returns true for numbers', () => expect(isPrimitive(42)).toBe(true))
  it('returns true for booleans', () => expect(isPrimitive(false)).toBe(true))
  it('returns false for objects', () => expect(isPrimitive({})).toBe(false))
  it('returns false for arrays', () => expect(isPrimitive([])).toBe(false))
  it('returns false for functions', () => expect(isPrimitive(() => {})).toBe(false))
})

describe('camelToKebab', () => {
  it('converts camelCase to kebab-case', () => {
    expect(camelToKebab('primaryProductName')).toBe('primary-product-name')
  })
  it('leaves already-kebab strings unchanged', () => {
    expect(camelToKebab('detail-page-path')).toBe('detail-page-path')
  })
  it('handles single word', () => {
    expect(camelToKebab('event')).toBe('event')
  })
  it('splits only at lowercase→uppercase boundaries (not consecutive uppercase)', () => {
    // camelToKebab only inserts hyphens at [a-z][A-Z] transitions
    expect(camelToKebab('eventURL')).toBe('event-url')
  })
})

describe('getMetadata', () => {
  const data = {
    event: {
      title: 'Summit',
      speakers: [{ name: 'Alice' }, { name: 'Bob' }],
    },
  }

  it('finds a top-level key', () => {
    expect(getMetadata('event', data)).toEqual(data.event)
  })

  it('finds a deeply nested key', () => {
    expect(getMetadata('title', data)).toBe('Summit')
  })

  it('finds a nested array', () => {
    expect(getMetadata('speakers', data)).toEqual(data.event.speakers)
  })

  it('returns undefined for missing key', () => {
    expect(getMetadata('missing', data)).toBeUndefined()
  })
})

describe('parseRegularPath', () => {
  const eventData = {
    speakers: [{ firstName: 'Alice' }, { firstName: 'Bob' }],
    venue: { city: 'SF' },
  }

  it('resolves colon-delimited array index', () => {
    expect(parseRegularPath('speakers:0', eventData)).toEqual({ firstName: 'Alice' })
  })

  it('resolves colon-delimited array index for second element', () => {
    expect(parseRegularPath('speakers:1', eventData)).toEqual({ firstName: 'Bob' })
  })

  it('resolves dot-delimited object path', () => {
    expect(parseRegularPath('venue.city', eventData)).toBe('SF')
  })

  it('falls back to empty string for out-of-bounds index', () => {
    expect(parseRegularPath('speakers:99', eventData)).toBe('')
  })

  it('falls back to empty string for missing key', () => {
    expect(parseRegularPath('missing', eventData)).toBe('')
  })
})

describe('replacePlaceholders', () => {
  const payload = {
    eventTitle: 'Adobe Summit',
    venue: { city: 'Las Vegas' },
    speakers: [{ firstName: 'Alice' }],
    photo: { imageUrl: 'https://example.com/img.jpg' },
  }

  it('replaces a simple [[kebab-key]] placeholder', () => {
    expect(replacePlaceholders('Title: [[event-title]]', payload)).toBe('Title: Adobe Summit')
  })

  it('replaces a nested [[parent-key.child-key]] placeholder', () => {
    expect(replacePlaceholders('City: [[venue.city]]', payload)).toBe('City: Las Vegas')
  })

  it('handles the special photoURL → photo.imageUrl mapping', () => {
    expect(replacePlaceholders('[[photoURL]]', payload)).toBe('https://example.com/img.jpg')
  })

  it('leaves placeholder intact when key is not found', () => {
    expect(replacePlaceholders('[[missing-key]]', payload)).toBe('[[missing-key]]')
  })

  it('replaces colon-syntax array placeholder [[scope:path:index]]', () => {
    const result = replacePlaceholders('[[speakers:0]]', payload)
    // speakers:0 resolves to the full object, stringified
    expect(result).not.toBe('[[speakers:0]]')
  })

  it('replaces multiple placeholders in one string', () => {
    const result = replacePlaceholders('[[event-title]] in [[venue.city]]', payload)
    expect(result).toBe('Adobe Summit in Las Vegas')
  })
})

describe('resolveArrayPlaceholders', () => {
  const jsonData = {
    event: {
      speakers: [
        { firstName: 'Alice', photo: { url: 'a.jpg' } },
        { firstName: 'Bob', photo: { url: 'b.jpg' } },
      ],
    },
  }

  it('finds and extracts array placeholder info', () => {
    const html = '<p>[[@array(event.speakers.firstName)]]</p>'
    const result = resolveArrayPlaceholders(html, jsonData)
    expect(result).not.toBeNull()
    expect(result!.placeholder).toBe('[[@array(event.speakers.firstName)]]')
    expect(result!.path).toBe('event.speakers.firstName')
    expect(result!.exists).toBe(true)
    expect(Object.keys(result!.values)).toEqual(['Alice', 'Bob'])
  })

  it('returns null when no @array placeholder is present', () => {
    expect(resolveArrayPlaceholders('<p>No placeholder</p>', jsonData)).toBeNull()
  })

  it('returns exists:false when array is empty', () => {
    const result = resolveArrayPlaceholders('[[@array(event.empty.name)]]', jsonData)
    expect(result?.exists).toBe(false)
  })
})

describe('updateFragmentPaths', () => {
  it('replaces [[fragment.name]] with an anchor tag when type is link', () => {
    const map = {
      rsvp: {
        links: [{ destinationPath: '/events/fragments/rsvp' }],
        fragment: { name: 'rsvp', type: 'link' },
        isArray: false,
      },
    }
    const result = updateFragmentPaths('[[fragment.rsvp]]', map)
    expect(result).toBe('<a href="/events/fragments/rsvp">/events/fragments/rsvp</a>')
  })

  it('replaces [[fragment.name]] with a relative value when type is relativeValue', () => {
    const map = {
      rsvp: {
        links: [{ destinationPath: '/events/fragments/rsvp' }],
        fragment: { name: 'rsvp', type: 'relativeValue' },
        isArray: false,
      },
    }
    const result = updateFragmentPaths('[[fragment.rsvp]]', map)
    expect(result).toContain('fragments/rsvp')
  })

  it('leaves unmatched placeholders intact', () => {
    const map = {}
    expect(updateFragmentPaths('[[fragment.missing]]', map)).toBe('[[fragment.missing]]')
  })

  it('handles array fragment with index placeholders', () => {
    const map = {
      speakers: {
        links: [
          { destinationPath: '/events/fragments/speakers/alice' },
          { destinationPath: '/events/fragments/speakers/bob' },
        ],
        fragment: { name: 'speakers', type: 'absoluteValue' },
        isArray: true,
      },
    }
    const html = '[[fragment.speakers]]:0 [[fragment.speakers]]:1'
    const result = updateFragmentPaths(html, map)
    expect(result).toContain('/events/fragments/speakers/alice')
    expect(result).toContain('/events/fragments/speakers/bob')
  })
})
