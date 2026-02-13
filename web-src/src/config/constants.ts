/**
 * Environment and domain constants used across the application
 * 
 * Environment is determined at BUILD TIME via the ENVIRONMENT variable,
 * set by CI/CD pipelines or .env file. This replaces runtime hostname detection.
 */

import { env, EnvironmentTier } from './env'

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
 * Map environment tier to IMS environment
 */
export function getImsEnvironment(): typeof IMS_ENVIRONMENTS[keyof typeof IMS_ENVIRONMENTS] {
  return env.ENVIRONMENT === 'prod' ? IMS_ENVIRONMENTS.PROD : IMS_ENVIRONMENTS.STAGE
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
 * Derive allowed hosts from API_CONFIG and add core domains
 */
export const ALLOWED_HOSTS: Record<string, boolean> = {
  [DOMAINS.ADOBE_COM]: true,
  [DOMAINS.STAGE_ADOBE_COM]: true,
  [DOMAINS.LOCALHOST]: true,
  ...Object.values(API_CONFIG.esl).reduce((acc, envConfig) => {
    try {
      const url = new URL(envConfig.host)
      acc[url.hostname] = true
    } catch (e) {
      console.warn('Invalid URL in API_CONFIG.esl:', envConfig.host)
    }
    return acc
  }, {} as Record<string, boolean>),
  ...Object.values(API_CONFIG.esp).reduce((acc, envConfig) => {
    try {
      const url = new URL(envConfig.host)
      acc[url.hostname] = true
    } catch (e) {
      console.warn('Invalid URL in API_CONFIG.esp:', envConfig.host)
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
 * Get current environment tier
 * 
 * Returns the build-time ENVIRONMENT value ('dev', 'stage', or 'prod')
 * Set via CI/CD pipeline or .env file. Defaults to 'dev'.
 */
export function getCurrentEnvironment(): Environment {
  return env.ENVIRONMENT
}

/**
 * Get API host for a service
 * 
 * @param service - 'esp' or 'esl'
 * @param overrideEnv - Optional environment override (mainly for testing)
 */
export function getApiHost(service: 'esp' | 'esl', overrideEnv?: Environment): string {
  const currentEnv = overrideEnv || env.ENVIRONMENT
  return API_CONFIG[service][currentEnv].host
}

/**
 * Check if running in local development (localhost)
 */
export function isLocalDevelopment(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
}
