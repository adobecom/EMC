import { escapeCsvValue } from './csvExport'

describe('escapeCsvValue — CSV/formula injection prevention', () => {
  it.each(['=', '+', '-', '@', '\t'])('neutralizes a leading %s with a quote prefix', (prefix) => {
    expect(escapeCsvValue(`${prefix}cmd|' /C calc'!A0`)).toBe(`'${prefix}cmd|' /C calc'!A0`)
  })

  it('neutralizes a leading \\r (also triggers quoting, since \\r is itself a quoting trigger)', () => {
    expect(escapeCsvValue('\rcmd')).toBe(`"'\rcmd"`)
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeCsvValue('VIP — CEO')).toBe('VIP — CEO')
  })

  it('still quotes values containing a comma', () => {
    expect(escapeCsvValue('Smith, John')).toBe('"Smith, John"')
  })

  it('returns an empty string for null/undefined', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })
})
