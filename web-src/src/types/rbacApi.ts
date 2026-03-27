/**
 * RBAC API type definitions
 *
 * Types matching the ESP RBAC OpenAPI spec (scopes, groups, roles, permissions).
 * These are the API-driven counterparts to the static rbac.ts types.
 */

// ============================================================================
// Enums & Primitives
// ============================================================================

export type ScopeType = 'platform' | 'org' | 'team'

export type RBACPermission =
  | '*:*'
  | '*:read' | '*:write' | '*:delete'
  | 'scope:*' | 'scope:read' | 'scope:write' | 'scope:delete'
  | 'scope-platform:*' | 'scope-platform:read' | 'scope-platform:write' | 'scope-platform:delete'
  | 'scope-org:*' | 'scope-org:read' | 'scope-org:write' | 'scope-org:delete'
  | 'scope-team:*' | 'scope-team:read' | 'scope-team:write' | 'scope-team:delete'
  | 'group:*' | 'group:read' | 'group:write' | 'group:delete'
  | 'user:*' | 'user:read' | 'user:write' | 'user:delete'
  | 'role:*' | 'role:read' | 'role:write' | 'role:delete'
  | 'config:*' | 'config:read' | 'config:write' | 'config:delete'
  | 'integration:*' | 'integration:read' | 'integration:write' | 'integration:delete'
  | 'series:*' | 'series:read' | 'series:write' | 'series:delete'
  | 'event:*' | 'event:read' | 'event:write' | 'event:delete'
  | 'session:*' | 'session:read' | 'session:write' | 'session:delete'
  | 'cloud:*' | 'cloud:read' | 'cloud:write' | 'cloud:delete'

// ============================================================================
// Core Models
// ============================================================================

export interface RBACApiScope {
  scopeId: string
  name: string
  type: ScopeType
  creationTime: number
  modificationTime: number
}

export interface RBACApiGroup {
  groupId: string
  name: string
  description?: string
  scopeId?: string
  scopeName?: string
  roleId: string | null
  creationTime: number
  modificationTime: number
}

export interface RBACApiRole {
  roleId: string
  name: string
  permissions: RBACPermission[]
  creationTime: number
  modificationTime: number
}

export interface ScopeUser {
  email: string
  firstName?: string
  lastName?: string
  userGuid?: string
  creationTime: number
  modificationTime: number
}

// ============================================================================
// Request Bodies
// ============================================================================

export interface ScopeCreateBody {
  name: string
  type: ScopeType
  parentScopeId?: string
}

export interface ScopeUpdateBody extends RBACApiScope {}

export interface GroupCreateBody {
  name: string
  description?: string
  roleId: string
}

export interface GroupUpdateBody {
  name: string
  description?: string
  roleId: string | null
  modificationTime: number
  groupId?: string
  scopeId?: string
  creationTime?: number
}

export interface ScopeUserCreateBody {
  email: string
  firstName?: string
  lastName?: string
  userGuid?: string
}

export interface ScopeUserUpdateBody {
  firstName?: string
  lastName?: string
  userGuid?: string
  modificationTime: number
}

export interface RoleCreateBody {
  name: string
  permissions: RBACPermission[]
}

export interface RoleUpdateBody extends RBACApiRole {}

// ============================================================================
// Response Envelopes
// ============================================================================

export interface ScopeListResponse {
  scopes: RBACApiScope[]
  count?: number
  nextPageToken?: string
}

export interface GroupListResponse {
  groups: RBACApiGroup[]
  count?: number
  nextPageToken?: string
}

export interface RoleListResponse {
  roles: RBACApiRole[]
  count?: number
  nextPageToken?: string
}

export interface ScopeUserListResponse {
  users: ScopeUser[]
  count?: number
  nextPageToken?: string
}

export interface PermissionsListResponse {
  permissions: RBACPermission[]
  count?: number
}

export interface ScopeChildRef {
  childScopeId: string
  parentScopeId: string
  creationTime?: number
  modificationTime?: number
}

export interface ScopeChildListResponse {
  parentScopeId: string
  children: Array<{
    childScopeId: string
    creationTime?: number
    modificationTime?: number
  }>
  count?: number
  nextPageToken?: string
}

export interface ScopeParentRef {
  parentScopeId: string
  creationTime?: number
  modificationTime?: number
}
