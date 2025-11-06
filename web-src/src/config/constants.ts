/**
 * Environment and domain constants used across the application
 * Based on the previous version's constants.js
 */

/**
 * Available application environments
 */
export const ENVIRONMENTS = Object.freeze({
  LOCAL: 'local',
  DEV: 'dev',
  DEV02: 'dev02',
  STAGE: 'stage',
  STAGE02: 'stage02',
  PROD: 'prod',
} as const)

export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS]

/**
 * Available IMS environments
 */
export const IMS_ENVIRONMENTS = Object.freeze({
  STAGE: 'stg1',
  PROD: 'prod',
} as const)

/**
 * Domain constants used across the application
 */
export const DOMAINS = Object.freeze({
  ADOBE_COM: 'www.adobe.com',
  INTERNAL_ADOBE_COM: 'events-internal.adobe.com',
  STAGE_ADOBE_COM: 'www.stage.adobe.com',
  STAGE_INTERNAL_ADOBE_COM: 'events-internal.stage.adobe.com',
  LOCALHOST: 'localhost',
  DEV_ADOBE_COM: 'dev.adobe.com',
  DEV_INTERNAL_ADOBE_COM: 'events-internal.dev.adobe.com',
  DEV02_ADOBE_COM: 'dev02.adobe.com',
  STAGE02_ADOBE_COM: 'stage02.adobe.com',
  CORP_ADOBE_COM: 'corp.adobe.com',
  GRAYBOX_ADOBE_COM: 'graybox.adobe.com',
} as const)

/**
 * Environment detection patterns
 */
export const HOST_PATTERNS: Record<Environment, (host: string) => boolean> = Object.freeze({
  [ENVIRONMENTS.LOCAL]: (host) => host.includes(DOMAINS.LOCALHOST),
  [ENVIRONMENTS.DEV02]: (host) => host.startsWith('dev02--') || host.includes(DOMAINS.DEV02_ADOBE_COM),
  [ENVIRONMENTS.DEV]: (host) => host.startsWith('dev--')
    || host.includes(DOMAINS.DEV_ADOBE_COM)
    || host.includes(DOMAINS.DEV_INTERNAL_ADOBE_COM),
  [ENVIRONMENTS.STAGE]: (host) => host.startsWith('stage--')
    || host.includes(DOMAINS.STAGE_ADOBE_COM)
    || host.includes(DOMAINS.STAGE_INTERNAL_ADOBE_COM)
    || host.includes(DOMAINS.CORP_ADOBE_COM)
    || host.includes(DOMAINS.GRAYBOX_ADOBE_COM),
  [ENVIRONMENTS.STAGE02]: (host) => host.startsWith('stage02--') || host.includes(DOMAINS.STAGE02_ADOBE_COM),
  [ENVIRONMENTS.PROD]: (host) => host.startsWith('main--')
    || host.endsWith('adobe.com')
    || host.includes(DOMAINS.INTERNAL_ADOBE_COM),
})

/**
 * API Configuration for ESL (Events Service Layer) and ESP (Events Service Platform)
 */
export const API_CONFIG = {
  esl: {
    [ENVIRONMENTS.LOCAL]: { host: 'https://wcms-events-service-layer-deploy-ethos102-stage-va-9c3ecd.stage.cloud.adobe.io' },
    [ENVIRONMENTS.DEV]: { host: 'https://wcms-events-service-layer-deploy-ethos102-stage-va-9c3ecd.stage.cloud.adobe.io' },
    [ENVIRONMENTS.DEV02]: { host: 'https://wcms-events-service-layer-deploy-ethos102-stage-va-d5dc93.stage.cloud.adobe.io' },
    [ENVIRONMENTS.STAGE]: { host: 'https://events-service-layer-stage.adobe.io' },
    [ENVIRONMENTS.STAGE02]: { host: 'https://wcms-events-service-layer-deploy-ethos105-stage-or-8f7ce1.stage.cloud.adobe.io' },
    [ENVIRONMENTS.PROD]: { host: 'https://events-service-layer.adobe.io' },
  },
  esp: {
    [ENVIRONMENTS.LOCAL]: { host: 'https://wcms-events-service-platform-deploy-ethos102-stage-caff5f.stage.cloud.adobe.io' },
    [ENVIRONMENTS.DEV]: { host: 'https://wcms-events-service-platform-deploy-ethos102-stage-caff5f.stage.cloud.adobe.io' },
    [ENVIRONMENTS.DEV02]: { host: 'https://wcms-events-service-platform-deploy-ethos102-stage-c81eb6.stage.cloud.adobe.io' },
    [ENVIRONMENTS.STAGE]: { host: 'https://events-service-platform-stage.adobe.io' },
    [ENVIRONMENTS.STAGE02]: { host: 'https://wcms-events-service-platform-deploy-ethos105-stage-9a5fdc.stage.cloud.adobe.io' },
    [ENVIRONMENTS.PROD]: { host: 'https://events-service-platform.adobe.io' },
  },
} as const

/**
 * Derive allowed hosts from API_CONFIG and add core domains
 */
export const ALLOWED_HOSTS: Record<string, boolean> = {
  [DOMAINS.ADOBE_COM]: true,
  [DOMAINS.STAGE_ADOBE_COM]: true,
  [DOMAINS.LOCALHOST]: true,
  ...Object.values(API_CONFIG.esl).reduce((acc, env) => {
    try {
      const url = new URL(env.host)
      acc[url.hostname] = true
    } catch (e) {
      console.warn('Invalid URL in API_CONFIG.esl:', env.host)
    }
    return acc
  }, {} as Record<string, boolean>),
  ...Object.values(API_CONFIG.esp).reduce((acc, env) => {
    try {
      const url = new URL(env.host)
      acc[url.hostname] = true
    } catch (e) {
      console.warn('Invalid URL in API_CONFIG.esp:', env.host)
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
 * Get current environment based on hostname
 */
export function getCurrentEnvironment(): Environment {
  const hostname = window.location.hostname

  // Check each environment pattern
  for (const [env, pattern] of Object.entries(HOST_PATTERNS)) {
    if (pattern(hostname)) {
      return env as Environment
    }
  }

  // Default to LOCAL if no match
  return ENVIRONMENTS.LOCAL
}

/**
 * Get API host for a service and environment
 */
export function getApiHost(service: 'esp' | 'esl', env?: Environment): string {
  const currentEnv = env || getCurrentEnvironment()
  return API_CONFIG[service][currentEnv].host
}

