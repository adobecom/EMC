import { getEventPageUrls } from './eventPageUrls'

describe('getEventPageUrls', () => {
  it('returns null urls when detailPagePath is missing', () => {
    expect(getEventPageUrls(undefined, { prodDomain: 'https://www.adobe.com', stageDomain: 'https://www.stage.adobe.com' }))
      .toEqual({ previewUrl: null, publishedUrl: null })
    expect(getEventPageUrls(null)).toEqual({ previewUrl: null, publishedUrl: null })
  })

  it('swaps host for preview (stage) and published (prod) while preserving the path', () => {
    const { previewUrl, publishedUrl } = getEventPageUrls(
      'https://www.adobe.com/events/max/2026/session-abc',
      { prodDomain: 'https://www.adobe.com', stageDomain: 'https://www.stage.adobe.com' }
    )
    expect(publishedUrl).toBe('https://www.adobe.com/events/max/2026/session-abc')
    expect(previewUrl?.startsWith('https://www.stage.adobe.com/events/max/2026/session-abc')).toBe(true)
  })

  it('falls back to the bare detailPagePath when no domain config is present', () => {
    const { previewUrl, publishedUrl } = getEventPageUrls('https://www.adobe.com/events/max/2026/session-abc', null)
    expect(publishedUrl).toBe('https://www.adobe.com/events/max/2026/session-abc')
    expect(previewUrl?.startsWith('https://www.adobe.com/events/max/2026/session-abc')).toBe(true)
  })

  it('falls back to the bare detailPagePath for the side missing from the domain config', () => {
    const withProdOnly = getEventPageUrls('https://www.adobe.com/events/max/2026/session-abc', { prodDomain: 'https://www.adobe.com' })
    expect(withProdOnly.publishedUrl).toBe('https://www.adobe.com/events/max/2026/session-abc')
    expect(withProdOnly.previewUrl?.startsWith('https://www.adobe.com/events/max/2026/session-abc')).toBe(true)

    const withStageOnly = getEventPageUrls('https://www.adobe.com/events/max/2026/session-abc', { stageDomain: 'https://www.stage.adobe.com' })
    expect(withStageOnly.publishedUrl).toBe('https://www.adobe.com/events/max/2026/session-abc')
    expect(withStageOnly.previewUrl?.startsWith('https://www.stage.adobe.com/events/max/2026/session-abc')).toBe(true)
  })

  it('does not carry a timing query param (unlike the legacy pre/post-event links)', () => {
    const { previewUrl, publishedUrl } = getEventPageUrls(
      'https://www.adobe.com/events/max/2026/session-abc',
      { prodDomain: 'https://www.adobe.com', stageDomain: 'https://www.stage.adobe.com' }
    )
    expect(previewUrl).not.toContain('timing=')
    expect(publishedUrl).not.toContain('timing=')
  })

  it('returns the original page url unchanged when the domain config host is unparseable', () => {
    const { previewUrl } = getEventPageUrls('https://www.adobe.com/events/max/2026/session-abc', { stageDomain: '::not a url::' })
    expect(previewUrl).toContain('https://www.adobe.com/events/max/2026/session-abc')
  })
})
