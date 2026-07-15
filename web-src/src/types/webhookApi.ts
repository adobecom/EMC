/*
* <license header>
*/

/**
 * Webhook Integrations API type definitions
 *
 * Types matching the ESP webhook integrations endpoints:
 *   /v1/scopes/{scopeId}/integrations
 *   /v1/scopes/{scopeId}/integrations/{integrationId}/deliveries
 *
 * A self-service webhook configurator: admins configure a webhook against a
 * resource+trigger (e.g. `event.update`), optional conditions, a payload
 * shape, a connection/auth config, and a retry policy. ESP fires webhooks
 * automatically and logs every delivery attempt.
 */

// ============================================================================
// Trigger
// ============================================================================

/** Known trigger resources. Kept as a union for Picker options, but the API
 *  type is widened to `string` since ESP may add resources without a client release.
 *  Includes values ESP's API accepts but doesn't yet fire triggers for (e.g. `attendee`
 *  has no scope-resolution path server-side today) -- see TRIGGER_RESOURCES in
 *  IntegrationFormDialog.tsx for the subset actually offered in the create/edit picker. */
export type IntegrationTriggerResource =
  | 'event' | 'series' | 'session' | 'sessionTime' | 'attendee' | 'speaker' | 'sponsor'

/** ESP's API accepts all three, but `delete` isn't outbox-wired for any resource yet --
 *  see TRIGGER_OPERATIONS in IntegrationFormDialog.tsx for the subset offered in the picker. */
export type IntegrationTriggerOperation = 'create' | 'update' | 'delete'

export interface IntegrationTrigger {
  resource: IntegrationTriggerResource | string
  operation: IntegrationTriggerOperation
}

// ============================================================================
// Conditions
// ============================================================================

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le'

/** ANDed together for v1 — and/or grouping is a stretch goal. */
export interface ConditionRule {
  propertyPath: string
  operator: ConditionOperator
  value: string
}

// ============================================================================
// Action (payload shape)
// ============================================================================

export interface IntegrationActionTransform {
  /** Maps source field name -> renamed output field name. */
  mapping: Record<string, string>
}

export interface IntegrationActionData {
  /** Which hydrated objects to include in the outbound payload, e.g. ['series','event','session']. */
  objects: string[]
  /** Optional field renaming per object, keyed by object name (matches an entry in `objects`). */
  transforms?: Record<string, IntegrationActionTransform>
}

export interface IntegrationAction {
  endpoint: string
  data: IntegrationActionData
}

// ============================================================================
// Connection / auth
// ============================================================================

/** `marketo` is a placeholder for future work -- ESP has no per-type delivery behavior
 *  today (only HMAC signing, gated on connection.hmac, not on type), so selecting it
 *  produces a plain generic webhook. Not offered in CONNECTION_TYPES in
 *  IntegrationFormDialog.tsx until that's actually implemented. */
export type ConnectionType = 'generic' | 'marketo'

/** Secrets are write-only — reads only ever report whether a value is set, never the value itself. */
export interface ConnectionSecretState {
  isSet: boolean
}

export interface ConnectionHmac {
  enabled: boolean
  headerName?: string
}

export interface ConnectionConfig {
  type: ConnectionType
  secrets: Record<string, ConnectionSecretState>
  hmac?: ConnectionHmac
}

/** Write-side counterpart of `ConnectionConfig` — secrets are sent as plain
 *  string values keyed by param name (never round-tripped from `isSet` reads). */
export interface ConnectionConfigWriteBody {
  type: ConnectionType
  secrets: Record<string, string>
  hmac?: ConnectionHmac
}

// ============================================================================
// Retry policy
// ============================================================================

export interface RetryPolicy {
  maxAttempts: number
  backoffSeconds: number[]
}

// ============================================================================
// Integration resource
// ============================================================================

export interface IntegrationApiResponse {
  integrationId: string
  scopeId: string
  name: string
  enabled: boolean
  trigger: IntegrationTrigger
  conditions: ConditionRule[]
  action: IntegrationAction
  connection: ConnectionConfig
  retryPolicy: RetryPolicy
  creationTime: number
  modificationTime: number
}

/** Body for POST (create) and PUT (update) — same shape, server assigns
 *  `integrationId`/`scopeId`/timestamps. */
export interface IntegrationWriteBody {
  name: string
  enabled: boolean
  trigger: IntegrationTrigger
  conditions: ConditionRule[]
  action: IntegrationAction
  connection: ConnectionConfigWriteBody
  retryPolicy: RetryPolicy
}

/** Lightweight shape the list endpoint actually returns — no `connection`,
 *  `conditions`, `action`, or timestamps. Fetch by id (`IntegrationApiResponse`)
 *  for the full record. */
export interface IntegrationSummary {
  integrationId: string
  scopeId: string
  name: string
  enabled: boolean
  trigger: IntegrationTrigger
}

export interface IntegrationListResponse {
  items: IntegrationSummary[]
  count: number
  nextPageToken?: string
}

/** Flattened dashboard row — mirrors how `EventDashboardItem` flattens
 *  `EventApiResponse` in domain.ts (one level of nesting, table-friendly keys).
 *
 *  Built from `IntegrationSummary` (name/enabled/trigger only); the remaining
 *  fields are populated by a follow-up per-row GET-by-id enrichment for
 *  visible rows (mirrors `lastDeliveryStatus`'s enrichment pattern) and are
 *  `undefined` until that resolves for a given row. */
export interface IntegrationDashboardItem {
  integrationId: string
  scopeId: string
  name: string
  enabled: boolean
  triggerResource: string
  triggerOperation: IntegrationTriggerOperation
  connectionType?: ConnectionType
  conditionCount?: number
  endpoint?: string
  creationTime?: number
  modificationTime?: number
  /** Populated by a follow-up enrichment fetch of the most recent delivery, if available. */
  lastDeliveryStatus?: DeliveryStatus
}

// ============================================================================
// Ping action
// ============================================================================

export interface PingResult {
  success: boolean
  statusCode?: number
  responseBody?: string
  error?: string
}

// ============================================================================
// Deliveries (jobs / delivery log)
// ============================================================================

export type DeliveryStatus = 'success' | 'retrying' | 'failed'

export interface DeliveryRecord {
  deliveryId: string
  integrationId: string
  status: DeliveryStatus
  attemptCount: number
  timestamp: number
  requestBody?: unknown
  requestTruncated?: boolean
  responseBody?: unknown
  responseTruncated?: boolean
  responseStatusCode?: number
  error?: string
}

export interface DeliveryListResponse {
  items: DeliveryRecord[]
  count: number
  nextPageToken?: string
}
