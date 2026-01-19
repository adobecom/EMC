/**
 * Service-level configuration constants.
 */

export const CONFIG_SERVICE = {
  cacheTtlMs: 5 * 60 * 1000,
  maxRetries: 2,
  retryDelayMs: 1000,
} as const
