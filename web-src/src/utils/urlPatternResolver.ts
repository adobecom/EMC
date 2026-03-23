/*
* URL Pattern Resolution Utilities
*
* Pure functions for resolving tokenized URL patterns into
* detailPagePath values during event creation.
*/

import type { EnvironmentTier } from '../config/env'
import type { EventFormData, SeriesApiResponse } from '../types/domain'

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
 * Join relatedDomain, contentRoot, and the resolved pattern into a
 * single path, normalizing slashes between segments.
 */
export function constructDetailPagePath(
  relatedDomain: string,
  contentRoot: string,
  resolvedPattern: string
): string {
  const domain = relatedDomain.replace(/\/+$/, '')
  const root = contentRoot.replace(/^\/+/, '').replace(/\/+$/, '')
  const pattern = resolvedPattern.replace(/^\/+/, '')

  const segments = [domain, root, pattern].filter(Boolean)
  return segments.join('/')
}
