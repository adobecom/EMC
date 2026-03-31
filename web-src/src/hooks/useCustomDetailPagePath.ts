/*
* Hook for custom detailPagePath construction based on external URL pattern config.
*
* During event creation, if the selected series has a URL pattern entry
* in url-patterns.json for the current environment, the FE builds the full
* detail page URL and sends it as `detailPagePath` on the create payload
* (via save extraPayload) instead of letting the API choose the path.
*/

import { useCallback, useEffect, useRef } from 'react'
import { cachedApi } from '../services/api'
import { configService } from '../services/configService'
import type {
  EventApiResponse,
  EventFormData,
  SeriesApiResponse,
  UrlPatternEntry,
} from '../types/domain'
import { getDetailPageLocalePrefixFromIetf } from '../config/detailPageLocalePrefix'
import {
  buildTokenContext,
  constructDetailPagePath,
  resolveUrlPattern,
} from '../utils/urlPatternResolver'

/** `url` is the full detail page URL — same value sent as API `detailPagePath` on create. */
export interface DetailPagePathResult {
  url: string
  collision: EventApiResponse | null
}

export function useCustomDetailPagePath() {
  const patternsRef = useRef<UrlPatternEntry[]>([])
  const loadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    configService.getUrlPatterns().then((patterns) => {
      if (!cancelled) {
        patternsRef.current = patterns
        loadedRef.current = true
      }
    }).catch((err) => {
      console.warn('Failed to load URL patterns config:', err)
    })
    return () => { cancelled = true }
  }, [])

  const getDetailPagePathForSave = useCallback(async (
    seriesId: string,
    formData: EventFormData
  ): Promise<DetailPagePathResult | null> => {
    if (!loadedRef.current) {
      try {
        patternsRef.current = await configService.getUrlPatterns()
        loadedRef.current = true
      } catch {
        return null
      }
    }

    const entry = patternsRef.current.find((p) => p.seriesId === seriesId)
    if (!entry) return null

    const seriesList: SeriesApiResponse[] = await cachedApi.getSeriesList()
    const series = seriesList.find((s) => s.seriesId === seriesId)
    if (!series) {
      console.warn(`Series ${seriesId} not found when resolving URL pattern`)
      return null
    }

    const relatedDomain = series.relatedDomain || ''
    const contentRoot = series.contentRoot || ''

    const context = buildTokenContext(formData, series)
    const resolved = resolveUrlPattern(entry.pattern, context)
    const localePrefix = getDetailPageLocalePrefixFromIetf(formData.defaultLocale)
    const url = constructDetailPagePath(
      relatedDomain,
      contentRoot,
      resolved,
      localePrefix
    )

    const allEvents: EventApiResponse[] = await cachedApi.getEventsList()
    const collision = allEvents.find((e) => e.detailPagePath === url) || null

    return { url, collision }
  }, [])

  return { getDetailPagePathForSave }
}
