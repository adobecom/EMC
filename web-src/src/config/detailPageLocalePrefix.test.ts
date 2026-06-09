import {
  getDetailPageLocalePrefixFromIetf,
  localeSiteKeyToPathPrefix,
} from './detailPageLocalePrefix'

describe('localeSiteKeyToPathPrefix', () => {
  it('returns empty string for default site key', () => {
    expect(localeSiteKeyToPathPrefix('')).toBe('')
  })

  it('returns non-empty keys unchanged', () => {
    expect(localeSiteKeyToPathPrefix('fr')).toBe('fr')
    expect(localeSiteKeyToPathPrefix('jp')).toBe('jp')
    expect(localeSiteKeyToPathPrefix('ca_fr')).toBe('ca_fr')
  })
})

describe('getDetailPageLocalePrefixFromIetf — default static map', () => {
  it('maps en-US to empty prefix', () => {
    expect(getDetailPageLocalePrefixFromIetf('en-US')).toBe('')
  })

  it('maps fr-FR to fr', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-FR')).toBe('fr')
  })

  it('maps fr-CA to ca_fr', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-CA')).toBe('ca_fr')
  })

  it('maps ja-JP to jp', () => {
    expect(getDetailPageLocalePrefixFromIetf('ja-JP')).toBe('jp')
  })

  it('maps de-DE to de', () => {
    expect(getDetailPageLocalePrefixFromIetf('de-DE')).toBe('de')
  })

  it('prefers uk for en-GB among duplicates', () => {
    expect(getDetailPageLocalePrefixFromIetf('en-GB')).toBe('uk')
  })

  it('uses heuristic for IETF not in static map', () => {
    expect(getDetailPageLocalePrefixFromIetf('es-US')).toBe('es-us')
    expect(getDetailPageLocalePrefixFromIetf('gsw-FR')).toBe('gsw-fr')
  })

  it('defaults missing/empty locale to en-US behavior', () => {
    expect(getDetailPageLocalePrefixFromIetf(undefined)).toBe('')
    expect(getDetailPageLocalePrefixFromIetf(null)).toBe('')
    expect(getDetailPageLocalePrefixFromIetf('')).toBe('')
  })

  it('is case-insensitive', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-fr')).toBe('fr')
    expect(getDetailPageLocalePrefixFromIetf('EN-gb')).toBe('uk')
  })
})

describe('getDetailPageLocalePrefixFromIetf — scope config locales', () => {
  const scopeLocales = [
    { code: 'fr-CA', name: 'French Canada', folder: 'ca_fr' },
    { code: 'en-US', name: 'English US', folder: '' },
    { code: 'de-DE', name: 'German', folder: 'de' },
    { code: 'ja-JP', name: 'Japanese', folder: 'jp' },
    { code: 'x-custom', name: 'Custom', folder: 'custom_path' },
  ]
  const ietfToSiteKeys = new Map(scopeLocales.map((l) => [l.code.trim().toLowerCase(), [l.folder]]))

  it('uses scope config folder when code matches', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-CA', ietfToSiteKeys)).toBe('ca_fr')
    expect(getDetailPageLocalePrefixFromIetf('de-DE', ietfToSiteKeys)).toBe('de')
  })

  it('returns empty string for en-US (default)', () => {
    expect(getDetailPageLocalePrefixFromIetf('en-US', ietfToSiteKeys)).toBe('')
  })

  it('resolves custom locale codes not in the static map', () => {
    expect(getDetailPageLocalePrefixFromIetf('x-custom', ietfToSiteKeys)).toBe('custom_path')
  })

  it('is case-insensitive', () => {
    expect(getDetailPageLocalePrefixFromIetf('FR-ca', ietfToSiteKeys)).toBe('ca_fr')
    expect(getDetailPageLocalePrefixFromIetf('JA-JP', ietfToSiteKeys)).toBe('jp')
  })

  it('falls back to heuristic for IETF not in scope config', () => {
    expect(getDetailPageLocalePrefixFromIetf('zz-ZZ', ietfToSiteKeys)).toBe('zz-zz')
  })
})
