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

describe('getDetailPageLocalePrefixFromIetf', () => {
  it('maps en-US to empty prefix (default row)', () => {
    expect(getDetailPageLocalePrefixFromIetf('en-US')).toBe('')
  })

  it('maps fr-FR to fr', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-FR')).toBe('fr')
  })

  it('maps fr-CA to milo site key ca_fr verbatim', () => {
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

  it('uses heuristic for ESP-only IETF not in milo map', () => {
    expect(getDetailPageLocalePrefixFromIetf('es-US')).toBe('es-us')
    expect(getDetailPageLocalePrefixFromIetf('gsw-FR')).toBe('gsw-fr')
    expect(getDetailPageLocalePrefixFromIetf('dsb-DE')).toBe('dsb-de')
    expect(getDetailPageLocalePrefixFromIetf('en-DE')).toBe('en-de')
  })

  it('defaults missing locale to en-US behavior', () => {
    expect(getDetailPageLocalePrefixFromIetf(undefined)).toBe('')
    expect(getDetailPageLocalePrefixFromIetf(null)).toBe('')
    expect(getDetailPageLocalePrefixFromIetf('')).toBe('')
  })

  it('is case-insensitive on IETF input', () => {
    expect(getDetailPageLocalePrefixFromIetf('fr-fr')).toBe('fr')
    expect(getDetailPageLocalePrefixFromIetf('EN-gb')).toBe('uk')
  })
})
