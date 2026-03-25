/**
 * RequirePermission — declarative permission gate component.
 *
 * Renders children only if the active role has the required permission(s).
 * Renders fallback (default: null) otherwise.
 */

import React, { ReactNode } from 'react'
import { useHasPermission, useHasAnyPermission } from '../../hooks/useHasPermission'

interface RequirePermissionProps {
  /** Single permission check: resource part (e.g. 'scope') */
  resource?: string
  /** Single permission check: access part (e.g. 'read') */
  access?: string
  /** Multiple permission checks (OR logic). Each entry is [resource, access]. */
  anyOf?: Array<[string, string]>
  /** What to render when permission check fails (default: null) */
  fallback?: ReactNode
  children: ReactNode
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  resource,
  access,
  anyOf,
  fallback = null,
  children
}) => {
  // Single permission mode
  const singleCheck = useHasPermission(resource || '', access || '')
  // Multi permission mode (OR)
  const anyCheck = useHasAnyPermission(anyOf || [])

  let allowed: boolean
  if (anyOf && anyOf.length > 0) {
    allowed = anyCheck
  } else if (resource && access) {
    allowed = singleCheck
  } else {
    // No permission specified — allow through
    allowed = true
  }

  return <>{allowed ? children : fallback}</>
}
