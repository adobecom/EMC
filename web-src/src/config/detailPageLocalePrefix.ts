/**
 * Map event form defaultLocale to a URL path fragment before contentRoot when building
 * detailPagePath (domain + localePrefix + contentRoot + pattern).
 *
 * The Language picker uses the same IETF tags as the ESP /v1/locales response (e.g. fr-CA).
 * We match that tag to `ietf` in LOCALES_BY_SITE_KEY, then use the matching object key
 * verbatim as the prefix (e.g. ca_fr), with no underscore-to-slash rewriting.
 */

import { DEFAULT_LOCALE } from './localeMapping'
import { LOCALES_BY_SITE_KEY } from './detailPageLocaleSiteKeys'

/** When several site keys share the same IETF, use this site key for the path. */
const IETF_TO_PREFERRED_SITE_KEY: Record<string, string> = {
  'en-gb': 'uk',
  'en-us': '',
}

function buildIetfToSiteKeysMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const siteKey of Object.keys(LOCALES_BY_SITE_KEY)) {
    const ietf = LOCALES_BY_SITE_KEY[siteKey]?.ietf?.trim().toLowerCase()
    if (!ietf) continue
    const list = map.get(ietf) ?? []
    list.push(siteKey)
    map.set(ietf, list)
  }
  return map
}

const IETF_TO_SITE_KEYS = buildIetfToSiteKeysMap()

/**
 * Use the milo locale site key as the path segment string unchanged.
 * Empty key is the default en-US row → no extra segment.
 */
export function localeSiteKeyToPathPrefix(siteKey: string): string {
  if (siteKey === '') return ''
  return siteKey
}

function pickSiteKeyForIetf(ietfLower: string, candidates: string[]): string {
  const preferred = IETF_TO_PREFERRED_SITE_KEY[ietfLower]
  if (preferred !== undefined && candidates.includes(preferred)) {
    return preferred
  }
  if (candidates.length === 1) return candidates[0]

  const sorted = [...candidates].sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length
    return a.localeCompare(b)
  })
  return sorted[0]
}

function heuristicPrefixFromIetf(ietf: string): string {
  return ietf.trim().toLowerCase().replace(/_/g, '-')
}

/**
 * Resolve IETF locale (from Language picker / defaultLocale) to a URL path prefix.
 * Returns '' when no segment should be inserted (default US English).
 *
 * Pass `ietfToSiteKeys` to override the default static map
 * for building it from scope config locales when available.
 */
export function getDetailPageLocalePrefixFromIetf(
  ietf: string | undefined | null,
  ietfToSiteKeys: Map<string, string[]> = IETF_TO_SITE_KEYS
): string {
  const normalized = (ietf?.trim() || DEFAULT_LOCALE).trim()
  const ietfLower = normalized.toLowerCase()

  const candidates = ietfToSiteKeys.get(ietfLower)
  if (!candidates?.length) {
    return heuristicPrefixFromIetf(normalized)
  }

  const siteKey = pickSiteKeyForIetf(ietfLower, candidates)
  return localeSiteKeyToPathPrefix(siteKey)
}
