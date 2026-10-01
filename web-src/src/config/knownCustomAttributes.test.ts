import { KNOWN_CUSTOM_ATTRIBUTES } from './knownCustomAttributes'

// Pins the wire contract each entry claims to match in event-libs (a separate repo nothing
// here can reach) — catches an accidental edit on this side only, not event-libs drift.
describe('KNOWN_CUSTOM_ATTRIBUTES data integrity', () => {
  it('has a unique name for every entry', () => {
    const names = KNOWN_CUSTOM_ATTRIBUTES.map(k => k.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has a non-empty label and description for every entry', () => {
    KNOWN_CUSTOM_ATTRIBUTES.forEach(k => {
      expect(k.label.trim()).not.toBe('')
      expect(k.description.trim()).not.toBe('')
    })
  })

  it('only suggests values for select-type entries', () => {
    KNOWN_CUSTOM_ATTRIBUTES.forEach(k => {
      if (k.inputType === 'text') expect(k.suggestedValues).toBeUndefined()
    })
  })

  it('pins the theme entry (event-libs applyAreaTheme, decorate.js)', () => {
    const theme = KNOWN_CUSTOM_ATTRIBUTES.find(k => k.name === 'theme')
    expect(theme?.inputType).toBe('single-select')
    expect(theme?.suggestedValues?.map(v => v.value)).toEqual(['light', 'dark'])
  })

  it('pins the hide-timezone-label entry (event-libs date-time-helper.js)', () => {
    const hideTimezoneLabel = KNOWN_CUSTOM_ATTRIBUTES.find(k => k.name === 'hide-timezone-label')
    expect(hideTimezoneLabel?.inputType).toBe('single-select')
    expect(hideTimezoneLabel?.suggestedValues?.map(v => v.value)).toEqual(['true', 'false'])
  })

  it('pins the promotionalItems entry (event-libs promotional-content block) with no fixed values', () => {
    const promotionalItems = KNOWN_CUSTOM_ATTRIBUTES.find(k => k.name === 'promotionalItems')
    expect(promotionalItems?.inputType).toBe('multi-select')
    expect(promotionalItems?.suggestedValues).toBeUndefined()
  })
})
