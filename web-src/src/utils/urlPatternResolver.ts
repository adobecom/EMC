/*
* URL Pattern Resolution Utilities
*
* Pure functions for resolving tokenized URL patterns into
* detailPagePath values during event creation.
*/

import type { EnvironmentTier } from '../config/env'
import type { EventApiResponse, EventFormData, SeriesApiResponse } from '../types/domain'
import { normalizeContentRoot, normalizeRelatedDomain } from './seriesFormAutoCorrect'

/**
 * Slugify a string for use in a URL path segment.
 * Lowercases, replaces whitespace with hyphens, strips non-URL-safe characters,
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

const ENV_SHEET_KEY_MAP: Record<EnvironmentTier, string> = {
  prod: 'data',
  stage: 'data-stage',
  dev: 'data-dev',
}

/**
 * Map an environment tier to the corresponding multi-sheet JSON key.
 */
export function getSheetKeyForEnvironment(environment: EnvironmentTier): string {
  return ENV_SHEET_KEY_MAP[environment] || 'data-dev'
}

/**
 * Build a flat token context from form data and series data.
 * Tokens are the raw values; slugification happens during resolution.
 */
export function buildTokenContext(
  formData: EventFormData,
  seriesData: SeriesApiResponse
): Record<string, string> {
  const localStartDate = formData.startDateTime
    ? formData.startDateTime.split('T')[0]
    : formData.localStartDate || ''

  return {
    enTitle: formData.enTitle || formData.name || '',
    seriesName: seriesData.seriesName || '',
    localStartDate,
    cloudType: formData.cloudType || '',
    eventType: formData.eventType || '',
  }
}

/**
 * Replace `{token}` placeholders in a pattern string with slugified
 * values from the provided context. Unresolved tokens are left as-is
 * so they're visible in the confirmation dialog as a signal something
 * is missing.
 */
export function resolveUrlPattern(
  pattern: string,
  context: Record<string, string>
): string {
  return pattern.replace(/\{(\w+)\}/g, (_match, token: string) => {
    const raw = context[token]
    if (raw === undefined || raw === '') return `{${token}}`
    return slugify(raw)
  })
}

/**
 * Normalize a resolved pattern into a bare relative URL that matches
 * ESP's writable `url` field pattern: `^(([a-z0-9\-]+\/?)+)$`.
 * Strips leading/trailing slashes, removes characters outside the
 * allowed set, and collapses duplicate slashes.
 */
export function normalizeRelativeUrl(resolved: string): string {
  return resolved
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-z0-9\-\/]/g, '')
    .replace(/\/{2,}/g, '/')
}

/**
 * Join relatedDomain, optional locale prefix, contentRoot, and the resolved
 * pattern into a single absolute detail URL (https://…), using the same
 * domain/root normalization as the series form so API `detailPagePath` matches list/get.
 */
export function constructDetailPagePath(
  relatedDomain: string,
  contentRoot: string,
  resolvedPattern: string,
  localePrefix?: string
): string {
  const domain = normalizeRelatedDomain(relatedDomain)
  const locale = (localePrefix ?? '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
  const root = normalizeContentRoot(contentRoot).replace(/^\/+/, '').replace(/\/+$/, '')
  const pattern = resolvedPattern.replace(/^\/+/, '')

  const segments = [domain, locale, root, pattern].filter(Boolean)
  return segments.join('/')
}

const TOKEN_REGEX = /\{(\w+)\}/g

/**
 * Distinct `{token}` names from a URL pattern string (order not guaranteed).
 */
export function extractUrlPatternTokens(pattern: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  pattern.replace(TOKEN_REGEX, (_m, token: string) => {
    if (!seen.has(token)) {
      seen.add(token)
      out.push(token)
    }
    return ''
  })
  return out
}

function formEventTypeToApi(eventType: string): string {
  const map: Record<string, string> = {
    'in-person': 'InPerson',
    webinar: 'Webinar',
    hybrid: 'Hybrid',
    InPerson: 'InPerson',
    Webinar: 'Webinar',
    Hybrid: 'Hybrid',
  }
  return map[eventType] || eventType
}

function effectiveEnTitleForUrl(formData: EventFormData, eventDataResp: EventApiResponse): {
  form: string
  saved: string
} {
  const formVal = (formData.enTitle || formData.name || '').trim()
  const loc = eventDataResp.defaultLocale || 'en-US'
  const savedVal = (
    eventDataResp.enTitle ||
    eventDataResp.localizations?.[loc]?.title ||
    ''
  ).trim()
  return { form: formVal, saved: savedVal }
}

function formLocalStartDate(formData: EventFormData): string {
  if (formData.startDateTime) return formData.startDateTime.split('T')[0] || ''
  return (formData.localStartDate || '').trim()
}

/**
 * Whether an edit may change the constructed detailPagePath for this pattern.
 * Unknown `{tokens}` in the pattern → true (re-run collision flow until mapped in buildTokenContext).
 */
export function patternTokensAffectingUrlChanged(
  pattern: string,
  formData: EventFormData,
  eventDataResp: EventApiResponse
): boolean {
  const locForm = (formData.defaultLocale || '').trim()
  const locSaved = (eventDataResp.defaultLocale || '').trim()
  if (locForm !== locSaved) return true

  const tokens = extractUrlPatternTokens(pattern)
  const known = new Set(['enTitle', 'seriesName', 'localStartDate', 'cloudType', 'eventType'])

  for (const token of tokens) {
    if (!known.has(token)) return true

    if (token === 'enTitle') {
      const { form, saved } = effectiveEnTitleForUrl(formData, eventDataResp)
      if (form !== saved) return true
    }
    if (token === 'seriesName') {
      if ((formData.seriesId || '') !== (eventDataResp.seriesId || '')) return true
    }
    if (token === 'localStartDate') {
      if (formLocalStartDate(formData) !== (eventDataResp.localStartDate || '').trim()) return true
    }
    if (token === 'cloudType') {
      if ((formData.cloudType || '') !== (eventDataResp.cloudType || '')) return true
    }
    if (token === 'eventType') {
      if (formEventTypeToApi(formData.eventType || '') !== (eventDataResp.eventType || '')) return true
    }
  }

  return false
}
