// DA (Document Authoring) and Helix configuration
export const DA_CONFIG = {
  url: 'https://admin.da.live',
  org: 'adobecom',
  branch: 'main',
  defaultSite: 'da-events',
} as const

export const HELIX_BASE_URL = 'https://admin.hlx.page'

export const DA_MARKER = 'DA_WEBHOOK'
export const EMC_MARKER = 'EMC'

/** Maps series.targetCms.code → DA site name */
export const TARGET_CMS_SITE_MAP: Record<string, string> = {
  'da-bacom': 'da-bacom',
  'da-acom': 'da-acom',
  'da-acom-fg': 'da-acom-fg',
}

export const DEFAULT_LOCALE = 'en-US'

/**
 * Default IETF locale → DA folder-prefix map.
 * Mirrors the `defaultLocales` object in events-platform-hh-webhooks/actions/appConfig.js.
 * Overridden at runtime by scope-config locales when available.
 */
export const DEFAULT_SP_LOCALES: Record<string, string> = {
  'en-US': '',
  'es-US': 'es',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'gsw-FR': 'fr',
  'de-DE': 'de',
  'dsb-DE': 'de',
  'ja-JP': 'jp',
  'en-DE': 'en',
  'en-GB': 'uk',
  'th-TH': 'th',
  'es-ES': 'es',
}

export const DEFAULT_LOCALIZATION_KEYS = ['venue', 'location', 'speakers', 'sponsors', 'photos', 'sessionTimes', 'series'] as const

export const HELIX_OPERATIONS = {
  PREVIEW: 'preview',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  CACHEPURGE: 'Purge',
  DELETE_PREVIEW: 'deletePreview',
} as const

export type HelixOperation = typeof HELIX_OPERATIONS[keyof typeof HELIX_OPERATIONS]

/** Get the DA site for a series based on its targetCms.code */
export function getDaSiteForSeries(targetCmsCode?: string): string {
  if (!targetCmsCode) return DA_CONFIG.defaultSite
  return TARGET_CMS_SITE_MAP[targetCmsCode] ?? DA_CONFIG.defaultSite
}
