/**
 * Hook for DA event page creation at runtime.
 *
 * Wraps daPageService.createEventPages and tracks status per invocation.
 * The hook is called inside useEventFormSave after getEventFull hydration.
 */

import { useCallback, useRef, useState } from 'react'
import { apiService } from '../services/api'
import { createEventPages, isDocumentAuthoringEvent } from '../services/da/daPageService'
import type { DaPageCreationResult, LocalePageResult } from '../services/da/daPageService'
import { DEFAULT_SP_LOCALES } from '../config/daConfig'

export type DaCreationStatus = 'idle' | 'creating' | 'success' | 'error' | 'partial'

export interface UseDaPageCreationReturn {
  /** Create event pages. Returns the result directly; status is also updated in state. */
  createPages: (opts: CreatePagesOptions) => Promise<DaPageCreationResult>
  status: DaCreationStatus
  /** Per-locale outcomes from the last invocation */
  localeResults: LocalePageResult[]
  /** Top-level error message if the entire operation failed */
  error: string | null
  reset: () => void
}

export interface CreatePagesOptions {
  /** Fully-hydrated event data from cachedApi.getEventFull */
  eventData: Record<string, any>
  /** true → Publish action (Helix live); false → Draft (preview only) */
  publish: boolean
  /** Forward liveUpdate flag for resolveHelixOperation */
  liveUpdate?: boolean
  /**
   * Optional IETF → folder map from scope-config locales.
   * Defaults to DEFAULT_SP_LOCALES when not provided.
   */
  spLocales?: Record<string, string>
  dryRun?: boolean
}

export function useDaPageCreation(): UseDaPageCreationReturn {
  const [status, setStatus] = useState<DaCreationStatus>('idle')
  const [localeResults, setLocaleResults] = useState<LocalePageResult[]>([])
  const [error, setError] = useState<string | null>(null)
  // Track in-flight invocation to avoid duplicate concurrent calls
  const inFlightRef = useRef<Promise<DaPageCreationResult> | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setLocaleResults([])
    setError(null)
    inFlightRef.current = null
  }, [])

  const createPages = useCallback(async (opts: CreatePagesOptions): Promise<DaPageCreationResult> => {
    const { eventData, publish, liveUpdate = false, spLocales = DEFAULT_SP_LOCALES, dryRun = false } = opts

    // Guard: only proceed for DA-targeted events
    if (!isDocumentAuthoringEvent(eventData)) {
      console.debug('useDaPageCreation: skipping — event is not DA-targeted')
      const empty: DaPageCreationResult = { success: true, results: [], allPages: [] }
      return empty
    }

    if (!eventData.detailPagePath) {
      console.warn('useDaPageCreation: skipping — no detailPagePath on event')
      const empty: DaPageCreationResult = { success: true, results: [], allPages: [] }
      return empty
    }

    // Avoid duplicate concurrent calls (e.g. double-click)
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    setStatus('creating')
    setError(null)
    setLocaleResults([])

    const token = apiService.getAuthTokenForExternalUse()
    if (!token) {
      const msg = 'DA page creation: no auth token available'
      setStatus('error')
      setError(msg)
      return { success: false, results: [], allPages: [] }
    }

    const promise = createEventPages({
      eventData,
      publish,
      liveUpdate,
      token,
      spLocales,
      dryRun,
    })
    inFlightRef.current = promise

    try {
      const result = await promise
      setLocaleResults(result.results)

      if (result.success) {
        setStatus('success')
      } else if (result.results.some((r) => r.success)) {
        setStatus('partial')
        const failedLocales = result.results.filter((r) => !r.success).map((r) => r.locale).join(', ')
        setError(`Page creation failed for some locales: ${failedLocales}`)
      } else {
        setStatus('error')
        const firstError = result.results.find((r) => r.error)?.error ?? 'Unknown error'
        setError(`Page creation failed: ${firstError}`)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus('error')
      setError(message)
      const failResult: DaPageCreationResult = { success: false, results: [], allPages: [] }
      return failResult
    } finally {
      inFlightRef.current = null
    }
  }, [])

  return { createPages, status, localeResults, error, reset }
}
