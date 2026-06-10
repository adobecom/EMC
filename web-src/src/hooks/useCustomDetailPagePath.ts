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
import type { Locale } from '../types/configApi'
import { getDetailPageLocalePrefixFromIetf } from '../config/detailPageLocalePrefix'
import {
  buildTokenContext,
  constructDetailPagePath,
  patternTokensAffectingUrlChanged,
  resolveUrlPattern,
} from '../utils/urlPatternResolver'

/** Options for {@link getDetailPagePathForSave}. */
export interface GetDetailPagePathForSaveOptions {
  /** When set, that event is ignored for collision (avoids matching the row being edited). */
  excludeEventId?: string
  /** Scope config locales from context. Falls back to static map when absent. */
  scopeLocales?: Locale[] | null
}

/** First event with this detail URL other than `excludeEventId` (for unit tests and hook). */
export function findDetailPagePathCollisionEvent(
  events: EventApiResponse[],
  url: string,
  excludeEventId?: string
): EventApiResponse | null {
  return (
    events.find(
      (e) =>
        e.detailPagePath === url &&
        (!excludeEventId || !e.eventId || e.eventId !== excludeEventId)
    ) || null
  )
}

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

  const ensurePatternsLoaded = useCallback(async (): Promise<boolean> => {
    if (!loadedRef.current) {
      try {
        patternsRef.current = await configService.getUrlPatterns()
        loadedRef.current = true
      } catch {
        return false
      }
    }
    return true
  }, [])

  /**
   * Whether this save should run URL resolution + collision (series has a pattern and create or URL-affecting edit).
   */
  const shouldRunCustomDetailPagePathFlow = useCallback(async (
    seriesId: string,
    formData: EventFormData,
    isExistingEvent: boolean,
    eventDataResp: EventApiResponse | null
  ): Promise<boolean> => {
    if (!(await ensurePatternsLoaded())) return false
    const entry = patternsRef.current.find((p) => p.seriesId === seriesId)
    if (!entry) return false
    if (!isExistingEvent || !eventDataResp) return true
    return patternTokensAffectingUrlChanged(entry.pattern, formData, eventDataResp)
  }, [ensurePatternsLoaded])

  const getDetailPagePathForSave = useCallback(async (
    seriesId: string,
    formData: EventFormData,
    options?: GetDetailPagePathForSaveOptions
  ): Promise<DetailPagePathResult | null> => {
    if (!(await ensurePatternsLoaded())) {
      return null
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

    const ietfToSiteKeys = options?.scopeLocales?.length
      ? new Map(options.scopeLocales.map((l) => [l.code.trim().toLowerCase(), [l.folder]]))
      : undefined
    const context = buildTokenContext(formData, series)
    const resolved = resolveUrlPattern(entry.pattern, context)
    const localePrefix = getDetailPageLocalePrefixFromIetf(formData.defaultLocale, ietfToSiteKeys)
    const url = constructDetailPagePath(
      relatedDomain,
      contentRoot,
      resolved,
      localePrefix
    )

    const allEvents: EventApiResponse[] = await cachedApi.getEventsList()
    const collision = findDetailPagePathCollisionEvent(
      allEvents,
      url,
      options?.excludeEventId
    )

    return { url, collision }
  }, [ensurePatternsLoaded])

  return { getDetailPagePathForSave, shouldRunCustomDetailPagePathFlow }
}
