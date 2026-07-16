/*
* Event Page URL Helpers
*
* Derives the "Preview page" (stage) and "View published page" (prod) URLs
* for an event from its stored detailPagePath (always a prod-host absolute
* URL) plus the scope's domain config. This replaces the old pre-event/
* post-event links, which launched the production URL with a `timing` query
* param and offered no way to reach stage without hand-editing the domain.
*
* Host-swap only — the path segment of detailPagePath is never touched, so
* scopes without a domain config (or with only one of prodDomain/stageDomain
* set) fall back to the bare detailPagePath for the missing side.
*/

import { getEspEnvParam } from '../config/constants'
import type { DomainSlice } from '../types/configApi'

export interface EventPageUrls {
  /** Stage-host URL to preview the current state of the page, or null if detailPagePath is missing. */
  previewUrl: string | null
  /** Prod-host URL for the live page, or null if detailPagePath is missing. */
  publishedUrl: string | null
}

/** Replaces the protocol+host of `pageUrl` with those of `host`, keeping path/search/hash unchanged.
 *  Returns null if either URL fails to parse (caller should fall back to the original page URL). */
function swapHost(pageUrl: string, host: string): string | null {
  try {
    const target = new URL(pageUrl)
    const replacement = new URL(host.startsWith('http') ? host : `https://${host}`)
    target.protocol = replacement.protocol
    target.host = replacement.host
    return target.toString()
  } catch {
    return null
  }
}

/** Builds preview (stage) and published (prod) URLs for an event page.
 *  `domain` is the scope's resolved "domain" config slice, if any. */
export function getEventPageUrls(
  detailPagePath: string | null | undefined,
  domain?: DomainSlice | null
): EventPageUrls {
  if (!detailPagePath) return { previewUrl: null, publishedUrl: null }

  const stageDomain = domain?.stageDomain
  const prodDomain = domain?.prodDomain

  let previewUrl = stageDomain ? (swapHost(detailPagePath, stageDomain) ?? detailPagePath) : detailPagePath
  let publishedUrl = prodDomain ? (swapHost(detailPagePath, prodDomain) ?? detailPagePath) : detailPagePath

  // The page's static shell is served from whichever host above, but it still queries
  // whichever ESP/ESL tier *this EMC build* talks to for dynamic content. Off-prod, that's
  // never the real production backend, so both links need espenv — same as the old
  // pre/post-event links, which carried it unconditionally regardless of domain.
  const espenv = getEspEnvParam()
  if (espenv) {
    try {
      const previewUrlObj = new URL(previewUrl)
      previewUrlObj.searchParams.set('espenv', espenv)
      previewUrl = previewUrlObj.toString()
    } catch {
      // Leave previewUrl unmodified if somehow invalid
    }
    try {
      const publishedUrlObj = new URL(publishedUrl)
      publishedUrlObj.searchParams.set('espenv', espenv)
      publishedUrl = publishedUrlObj.toString()
    } catch {
      // Leave publishedUrl unmodified if somehow invalid
    }
  }

  return { previewUrl, publishedUrl }
}
