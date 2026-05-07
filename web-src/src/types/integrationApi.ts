/**
 * Integration API type definitions
 *
 * Types matching the ESP integration endpoints at /v1/scopes/:scopeId/integrations.
 * Integrations are webhook configurations that fire on ESP resource events
 * and POST a hydrated payload to a third-party endpoint.
 */

// ============================================================================
// Enums & Primitives
// ============================================================================

export type TriggerResource = 'event' | 'session' | 'series' | 'speaker' | 'sponsor'

export type TriggerOperation = 'create' | 'update' | 'delete'

export type AuthType = 'none' | 'bearer' | 'api_key' | 'hmac'

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le'

export type LogicalOperator = 'and' | 'or'

export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying'

export const TRIGGER_RESOURCES: TriggerResource[] = ['event', 'session', 'series', 'speaker', 'sponsor']

export const TRIGGER_OPERATIONS: TriggerOperation[] = ['create', 'update', 'delete']

export const PAYLOAD_OBJECTS = ['event', 'series', 'session', 'speaker', 'sponsor'] as const

// ============================================================================
// Condition Rules
// ============================================================================

/** A leaf condition rule: property == value */
export interface ConditionLeafRule {
  property: string
  operator: ConditionOperator
  value: string
}

/** A group rule combining child rules with AND/OR */
export interface ConditionGroupRule {
  operator: LogicalOperator
  rules: ConditionRule[]
}

export type ConditionRule = ConditionLeafRule | ConditionGroupRule

export interface TriggerConditions {
  rules: ConditionRule[]
}

// ============================================================================
// Trigger Config
// ============================================================================

export interface TriggerConfig {
  resource: TriggerResource
  operations: TriggerOperation[]
  conditions?: TriggerConditions
}

// ============================================================================
// Connection Config
// ============================================================================

export interface AuthConfig {
  type: AuthType
  secretRef?: string
}

export interface RetryPolicy {
  maxAttempts: number
  backoffSeconds: number[]
}

/**
 * A connection parameter.
 * On create/update: `value` is provided (plaintext, stored as secret).
 * On read: `value` is omitted; `isSet` indicates whether a secret is stored.
 */
export interface ConnectionParameter {
  key: string
  value?: string        // write-only; never returned from API
  secret?: boolean
  secretRef?: string    // set by server after create
  isSet?: boolean       // true when a secret value has been stored
}

export interface ConnectionConfig {
  type: 'webhook'
  endpoint: string
  method: 'POST'
  auth?: AuthConfig
  parameters?: ConnectionParameter[]
  retryPolicy?: RetryPolicy
}

// ============================================================================
// Payload Config
// ============================================================================

export interface FieldTransform {
  mapping?: Record<string, string>  // { sourceField: destinationField }
}

export interface PayloadConfig {
  objects: string[]
  transforms?: Record<string, FieldTransform>
}

// ============================================================================
// Integration
// ============================================================================

export interface Integration {
  integrationId: string
  scopeId: string
  scopeType: 'org' | 'team'
  name: string
  description?: string
  enabled: boolean
  createdBy?: string
  creationTime?: number
  modificationTime?: number
  triggers: TriggerConfig[]
  connection: ConnectionConfig
  payload: PayloadConfig
}

// ============================================================================
// Request Bodies
// ============================================================================

export interface IntegrationCreateBody {
  name: string
  description?: string
  enabled: boolean
  triggers: TriggerConfig[]
  connection: ConnectionConfig
  payload: PayloadConfig
}

export type IntegrationUpdateBody = Partial<IntegrationCreateBody>

// ============================================================================
// Response Envelopes
// ============================================================================

export interface IntegrationListResponse {
  integrations: Integration[]
  nextPageToken: string | null
}

// ============================================================================
// Ping
// ============================================================================

export interface IntegrationPingResult {
  integrationId: string
  status: 'ok' | 'error'
  credentialsValid: boolean
  error: string | null
}

// ============================================================================
// Deliveries
// ============================================================================

export interface TriggerContext {
  resource: string
  operation: string
  resourceId: string
}

export interface DeliveryRequest {
  method: string
  url: string
  body?: string
  bodySize?: number
}

export interface DeliveryResponse {
  status: number
}

export interface DeliveryError {
  message: string
}

export interface Delivery {
  deliveryId: string
  integrationId: string
  scopeId: string
  status: DeliveryStatus
  triggerContext: TriggerContext
  triggeredAt: string
  attempt: number
  maxAttempts: number
  deliveredAt?: string
  request?: DeliveryRequest
  response?: DeliveryResponse
  error?: DeliveryError
}

export interface DeliveryListResponse {
  deliveries: Delivery[]
  nextPageToken: string | null
}

export interface RedeliverResponse {
  deliveryId: string
  status: 'retrying'
}
