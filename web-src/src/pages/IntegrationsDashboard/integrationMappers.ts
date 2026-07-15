/*
* <license header>
*/

/**
 * integrationMappers — pure data-shaping helpers for IntegrationsDashboard, factored into
 * their own dependency-free module (no React/@react-spectrum imports) so they're
 * unit-testable: this repo's Jest config runs in a plain node environment with no
 * transform for @react-spectrum/s2's bundled CSS imports, so any file that imports it
 * (including IntegrationsDashboard.tsx itself) can't be required from a test today.
 */

import type {
  IntegrationApiResponse,
  IntegrationSummary,
  IntegrationDashboardItem,
  IntegrationWriteBody,
} from '../../types/webhookApi'

/** Builds a dashboard row from the list endpoint's lightweight summary.
 *  `connectionType`/`conditionCount`/`endpoint`/timestamps aren't in the
 *  summary — they're filled in by `mergeIntegrationDetail` once the
 *  per-row GET-by-id enrichment resolves for a visible row. */
export function toIntegrationDashboardItem(item: IntegrationSummary): IntegrationDashboardItem {
  return {
    integrationId: item.integrationId,
    scopeId: item.scopeId,
    name: item.name,
    enabled: item.enabled,
    triggerResource: item.trigger?.resource || '',
    triggerOperation: item.trigger?.operation || 'update',
  }
}

/** Merges a full `IntegrationApiResponse` (from the by-id enrichment fetch)
 *  into an existing dashboard row, populating the fields the summary omits. */
export function mergeIntegrationDetail(item: IntegrationDashboardItem, raw: IntegrationApiResponse): IntegrationDashboardItem {
  return {
    ...item,
    connectionType: raw.connection?.type || 'generic',
    conditionCount: raw.conditions?.length || 0,
    endpoint: raw.action?.endpoint || '',
    creationTime: raw.creationTime,
    modificationTime: raw.modificationTime,
  }
}

/** Builds a full write body from an existing API response, for quick mutations
 *  (e.g. the enable/disable toggle) that don't go through the edit dialog.
 *  Secret values are intentionally omitted — ESP never returns them in
 *  plaintext, so a write body can only ever resend a *new* value for a
 *  secret; keys omitted here are left untouched server-side. */
export function toWriteBody(item: IntegrationApiResponse, overrides?: Partial<IntegrationWriteBody>): IntegrationWriteBody {
  return {
    name: item.name,
    enabled: item.enabled,
    trigger: { ...item.trigger },
    conditions: item.conditions.map((c) => ({ ...c })),
    action: {
      endpoint: item.action.endpoint,
      data: {
        objects: [...item.action.data.objects],
        ...(item.action.data.transforms ? { transforms: item.action.data.transforms } : {}),
      },
    },
    connection: {
      type: item.connection.type,
      secrets: {},
      ...(item.connection.hmac ? { hmac: { ...item.connection.hmac } } : {}),
    },
    retryPolicy: {
      maxAttempts: item.retryPolicy.maxAttempts,
      backoffSeconds: [...item.retryPolicy.backoffSeconds],
    },
    ...overrides,
  }
}
