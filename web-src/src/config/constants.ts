/**
 * Environment and domain constants used across the application
 *
 * Environment is determined by:
 * 1. Runtime hostname detection (when deployed to Adobe hosts) — ensures stage URLs use stage ESP
 * 2. Build-time ENVIRONMENT variable (CI/CD or .env) — fallback for localhost and when hostname is ambiguous
 */

import { env, EnvironmentTier, DEV_TOKEN_ALLOWED_HOSTNAMES } from './env'

/**
 * Application environment tiers
 * Simplified to 3 tiers that map to API backends
 */
export const ENVIRONMENTS = Object.freeze({
  DEV: 'dev',
  STAGE: 'stage',
  PROD: 'prod',
} as const)

export type Environment = EnvironmentTier

/**
 * Available IMS environments
 */
export const IMS_ENVIRONMENTS = Object.freeze({
  STAGE: 'stg1',
  PROD: 'prod',
} as const)

/**
 * Map environment tier to IMS environment.
 * Uses runtime hostname detection so the IMS environment always matches the URL
 * being accessed — not just the build-time ENVIRONMENT variable.
 * This prevents a stage URL from redirecting to prod IMS when the prod build is deployed.
 */
export function getImsEnvironment(): typeof IMS_ENVIRONMENTS[keyof typeof IMS_ENVIRONMENTS] {
  return getCurrentEnvironment() === 'prod' ? IMS_ENVIRONMENTS.PROD : IMS_ENVIRONMENTS.STAGE
}

/**
 * Domain constants used across the application
 * Kept for reference and ALLOWED_HOSTS generation
 */
export const DOMAINS = Object.freeze({
  ADOBE_COM: 'www.adobe.com',
  INTERNAL_ADOBE_COM: 'events-internal.adobe.com',
  STAGE_ADOBE_COM: 'www.stage.adobe.com',
  LOCALHOST: 'localhost',
} as const)

/**
 * API Configuration for ESL (Events Service Layer) and ESP (Events Service Platform)
 * Simplified to 3 environment tiers
 */
export const API_CONFIG = {
  esl: {
    [ENVIRONMENTS.DEV]: { host: 'https://wcms-events-service-layer-deploy-ethos102-stage-va-9c3ecd.stage.cloud.adobe.io' },
    [ENVIRONMENTS.STAGE]: { host: 'https://events-service-layer-stage.adobe.io' },
    [ENVIRONMENTS.PROD]: { host: 'https://events-service-layer.adobe.io' },
  },
  esp: {
    [ENVIRONMENTS.DEV]: { host: 'https://wcms-events-service-platform-deploy-ethos102-stage-caff5f.stage.cloud.adobe.io' },
    [ENVIRONMENTS.STAGE]: { host: 'https://events-service-platform-stage.adobe.io' },
    [ENVIRONMENTS.PROD]: { host: 'https://events-service-platform.adobe.io' },
  },
} as const

/**
 * Profile API (cc-collab) for IMS user avatar
 * Production uses cc-collab.adobe.io; dev/stage use cc-collab-stage.adobe.io
 */
export const PROFILE_API_CONFIG = {
  [ENVIRONMENTS.DEV]: { host: 'https://cc-collab-stage.adobe.io' },
  [ENVIRONMENTS.STAGE]: { host: 'https://cc-collab-stage.adobe.io' },
  [ENVIRONMENTS.PROD]: { host: 'https://cc-collab.adobe.io' },
} as const

/**
 * Derive allowed hosts from API_CONFIG and add core domains
 */
export const ALLOWED_HOSTS: Record<string, boolean> = {
  [DOMAINS.ADOBE_COM]: true,
  [DOMAINS.STAGE_ADOBE_COM]: true,
  [DOMAINS.LOCALHOST]: true,
  'cc-collab.adobe.io': true,
  'cc-collab-stage.adobe.io': true,
  ...Object.values(API_CONFIG.esl).reduce((acc, envConfig) => {
    try {
      const url = new URL(envConfig.host)
      acc[url.hostname] = true
    } catch (e) {
      // Invalid URL - skip this host
    }
    return acc
  }, {} as Record<string, boolean>),
  ...Object.values(API_CONFIG.esp).reduce((acc, envConfig) => {
    try {
      const url = new URL(envConfig.host)
      acc[url.hostname] = true
    } catch (e) {
      // Invalid URL - skip this host
    }
    return acc
  }, {} as Record<string, boolean>),
}

export const LINK_REGEX = '^https:\\/\\/[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,63}(:[0-9]{1,5})?(\\/.*)?$'
export const ALLOWED_ACCOUNT_TYPES = ['type3', 'type2e']

export const SUPPORTED_CLOUDS = [
  { id: 'CreativeCloud', name: 'Creative Cloud' },
  { id: 'ExperienceCloud', name: 'Experience Cloud' }
] as const

export const TARGET_CMS_ENDPOINT = '/ecc/system/target-cms-map.json'

export const EVENT_TYPES = {
  IN_PERSON: 'InPerson',
  WEBINAR: 'Webinar',
  HYBRID: 'Hybrid',
} as const

export const CONTENT_TYPE_TAGS = {
  [EVENT_TYPES.WEBINAR]: {
    title: 'Webinar',
    caasId: 'caas:content-type/webinar',
  },
  [EVENT_TYPES.IN_PERSON]: {
    title: 'In-Person Event',
    caasId: 'caas:content-type/in-person-event',
  },
} as const

/**
 * Default save policies - only save ESP data to preview with BE driven SP update logics
 */
export const DEFAULT_SAVE_POLICIES = {
  forceSpWrite: false,
  liveUpdate: false,
} as const

/**
 * Detect environment from hostname when running in browser.
 * Maps Adobe App Builder / ExC deployment URLs to the correct ESP/ESL tier.
 * Returns null when hostname doesn't clearly indicate an environment (e.g. localhost).
 */
function getEnvironmentFromHostname(): Environment | null {
  if (typeof window === 'undefined') return null
  const h = window.location.hostname.toLowerCase()

  // Stage: explicit stage hostnames (stage deployment, stage.adobe.com)
  if (h.startsWith('stage--') || h.includes('stage.adobe') || h.includes('stage.adobeio-static.net')) {
    return ENVIRONMENTS.STAGE
  }

  // Prod: adobe.com excluding stage (main-- can be stage or prod, use build-time)
  if (h.endsWith('.adobe.com') && !h.includes('stage')) {
    return ENVIRONMENTS.PROD
  }

  // Dev: localhost or dev-- prefix
  if (h === 'localhost' || h === '127.0.0.1') {
    return ENVIRONMENTS.DEV
  }
  if (h.startsWith('dev--')) {
    return ENVIRONMENTS.DEV
  }

  // Adobeio-static.net workspace URLs — checked against the known hostname lists:
  //   14257-emc.adobeio-static.net          → prod (no workspace suffix)
  //   14257-emc-stage.adobeio-static.net    → stage (-stage suffix)
  //   14257-emc-dev.adobeio-static.net      → dev (listed in DEV_TOKEN_ALLOWED_HOSTNAMES)
  //   14257-emc-<username>.adobeio-static.net → dev (listed in DEV_TOKEN_ALLOWED_HOSTNAMES)
  // DEV_TOKEN_ALLOWED_HOSTNAMES is the single source of truth for known dev workspaces.
  if (h.endsWith('.adobeio-static.net')) {
    if (DEV_TOKEN_ALLOWED_HOSTNAMES.includes(h)) return ENVIRONMENTS.DEV
    if (h.includes('-stage.') || h.includes('-stage')) return ENVIRONMENTS.STAGE
    return ENVIRONMENTS.PROD
  }

  return null
}

/**
 * Get current environment tier.
 *
 * Uses runtime hostname detection when it clearly indicates stage/dev/prod.
 * Falls back to build-time ENVIRONMENT (CI/CD or .env) for localhost and ambiguous hostnames.
 */
export function getCurrentEnvironment(): Environment {
  const hostnameEnv = getEnvironmentFromHostname()
  if (hostnameEnv !== null) {
    return hostnameEnv
  }
  return env.ENVIRONMENT
}

/**
 * Get API host for a service
 *
 * @param service - 'esp' or 'esl'
 * @param overrideEnv - Optional environment override (mainly for testing)
 */
export function getApiHost(service: 'esp' | 'esl', overrideEnv?: Environment): string {
  const currentEnv = overrideEnv ?? getCurrentEnvironment()
  return API_CONFIG[service][currentEnv].host
}

/**
 * Get Profile API host for IMS avatar
 * Prod uses cc-collab.adobe.io; dev/stage use cc-collab-stage.adobe.io
 */
export function getProfileApiHost(overrideEnv?: Environment): string {
  const currentEnv = overrideEnv ?? getCurrentEnvironment()
  return PROFILE_API_CONFIG[currentEnv].host
}

/**
 * Get the `espenv` query parameter value to append to event preview URLs.
 * This tells the event detail page which ESP backend to call.
 * Returns null for production (parameter should be omitted entirely).
 */
export function getEspEnvParam(): string | null {
  const currentEnv = getCurrentEnvironment()
  if (currentEnv === ENVIRONMENTS.PROD) return null
  return currentEnv
}

/**
 * Check if running in local development (localhost)
 */
export function isLocalDevelopment(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
}
