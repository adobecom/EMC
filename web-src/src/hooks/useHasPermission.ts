/**
 * useHasPermission — check the active group's permissions for UI gating.
 *
 * Supports wildcards on both resource and access sides:
 *   '*:*'          → matches everything
 *   'scope:*'      → matches scope:read, scope:write, scope:delete
 *   '*:read'       → matches any resource with read access
 *   'scope:read'   → exact match
 *
 * Scope-type qualifiers are also resolved:
 *   A role with 'scope:read' also grants 'scope-org:read', 'scope-platform:read', etc.
 */

import { useGroup } from '../contexts/GroupContext'
import type { RBACPermission } from '../types/rbacApi'

/**
 * Check whether the active role's permissions satisfy a required permission.
 * Pure function — no React hooks, usable in non-component code.
 */
export function checkPermission(
  permissions: Set<RBACPermission>,
  resource: string,
  access: string
): boolean {
  // Global wildcard
  if (permissions.has('*:*' as RBACPermission)) return true

  // Exact match
  if (permissions.has(`${resource}:${access}` as RBACPermission)) return true

  // Resource wildcard: scope:* covers scope:read
  if (permissions.has(`${resource}:*` as RBACPermission)) return true

  // Access wildcard: *:read covers scope:read
  if (permissions.has(`*:${access}` as RBACPermission)) return true

  // Scope-type qualification: scope:read also grants scope-org:read, scope-platform:read, etc.
  if (resource.startsWith('scope-')) {
    const baseResource = 'scope'
    if (permissions.has(`${baseResource}:${access}` as RBACPermission)) return true
    if (permissions.has(`${baseResource}:*` as RBACPermission)) return true
  }

  return false
}

/**
 * Hook: returns true if the active role has the specified permission.
 */
export function useHasPermission(resource: string, access: string): boolean {
  const { permissions } = useGroup()
  return checkPermission(permissions, resource, access)
}

/**
 * Hook: returns true if the active role has ANY of the specified permissions (OR logic).
 */
export function useHasAnyPermission(checks: Array<[string, string]>): boolean {
  const { permissions } = useGroup()
  return checks.some(([resource, access]) => checkPermission(permissions, resource, access))
}

/**
 * Hook: returns true if the active role has ALL of the specified permissions (AND logic).
 */
export function useHasAllPermissions(checks: Array<[string, string]>): boolean {
  const { permissions } = useGroup()
  return checks.every(([resource, access]) => checkPermission(permissions, resource, access))
}
