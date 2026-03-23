/**
 * GroupContext — API-driven RBAC group selection and permission resolution.
 *
 * On app mount (when API is ready), fetches the user's groups via
 * GET /v1/users/me/groups. Manages active group selection, resolves the
 * active group's role, and exposes a permissions Set for UI gating.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useApi } from './ApiContext'
import type { RBACApiGroup, RBACApiRole, RBACPermission } from '../types/rbacApi'
import { clearAllCaches } from '../services/cacheUtils'
import { clearAllEnrichmentCaches } from '../services/eventEnrichment'

const STORAGE_KEY = 'emc_active_group_id'

// ============================================================================
// Types
// ============================================================================

export interface GroupContextValue {
  /** All groups the current user belongs to */
  groups: RBACApiGroup[]
  /** The currently active group (determines RBAC header) */
  activeGroup: RBACApiGroup | null
  /** The role associated with the active group */
  activeRole: RBACApiRole | null
  /** Flat set of permission strings from the active role */
  permissions: Set<RBACPermission>
  /** Whether groups are still being loaded */
  isLoading: boolean
  /** Error message if group fetch failed */
  error: string | null
  /** Increments on every group switch — use as a dependency to re-fetch data */
  groupVersion: number
  /** True when user has multiple groups and hasn't chosen one yet */
  needsGroupSelection: boolean
  /** Switch the active group by groupId */
  setActiveGroup: (groupId: string) => void
  /** Re-fetch groups from the API */
  refreshGroups: () => Promise<void>
}

// ============================================================================
// Context
// ============================================================================

const GroupContext = createContext<GroupContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

interface GroupProviderProps {
  children: ReactNode
}

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const { isApiReady, ims } = useAuth()
  const apiService = useApi()

  const [groups, setGroups] = useState<RBACApiGroup[]>([])
  const [activeGroup, setActiveGroupState] = useState<RBACApiGroup | null>(null)
  const [activeRole, setActiveRole] = useState<RBACApiRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupVersion, setGroupVersion] = useState(0)
  const [needsGroupSelection, setNeedsGroupSelection] = useState(false)

  // Derived permissions set
  const permissions = useMemo<Set<RBACPermission>>(
    () => new Set(activeRole?.permissions ?? []),
    [activeRole]
  )

  // Fetch user groups
  const fetchGroups = useCallback(async (): Promise<RBACApiGroup[]> => {
    const result = await apiService.getMyGroups()
    if ('error' in result) {
      throw new Error(typeof result.error === 'string' ? result.error : 'Failed to fetch groups')
    }
    return result
  }, [apiService])

  // Fetch role for a group
  const fetchRole = useCallback(async (roleId: string): Promise<RBACApiRole | null> => {
    if (!roleId) return null
    const result = await apiService.getRoleById(roleId)
    if ('error' in result) {
      // 403 means the user lacks role:read — they can't see their own role details.
      // Fall back to unrestricted client-side permissions; the API still enforces
      // permissions server-side on every request via resolveGroupRole middleware.
      if (result.status === 403) {
        console.warn('Cannot read role (no role:read permission) — skipping client-side permission gating')
        return {
          roleId,
          name: 'unknown',
          permissions: [
            'event:*',
            'series:*',
            'session:*',
            'cloud:*',
            'config:*',
            'integration:*',
          ] as RBACPermission[],
          creationTime: 0,
          modificationTime: 0,
        }
      }
      console.error('Failed to fetch role:', result)
      return null
    }
    return result
  }, [apiService])

  // Select a group and resolve its role
  const selectGroup = useCallback(async (group: RBACApiGroup) => {
    setActiveGroupState(group)
    apiService.setGroupId(group.groupId)

    // Clear all cached data — the new group may have different access
    clearAllCaches()
    clearAllEnrichmentCaches()

    // Persist selection
    try {
      sessionStorage.setItem(STORAGE_KEY, group.groupId)
    } catch {
      // sessionStorage may be unavailable
    }

    // Resolve role BEFORE bumping groupVersion so that permissions
    // are available when dashboards react to the version change
    if (group.roleId) {
      const role = await fetchRole(group.roleId)
      setActiveRole(role)
    } else {
      setActiveRole(null)
    }

    setGroupVersion(v => v + 1)
  }, [apiService, fetchRole])

  // Public: switch active group by ID
  const setActiveGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.groupId === groupId)
    if (group) {
      setNeedsGroupSelection(false)
      selectGroup(group)
    }
  }, [groups, selectGroup])

  // Public: refresh groups
  const refreshGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedGroups = await fetchGroups()
      setGroups(fetchedGroups)

      // Re-select active group if it still exists
      const currentId = activeGroup?.groupId
      const stillExists = currentId && fetchedGroups.find(g => g.groupId === currentId)
      if (stillExists) {
        await selectGroup(stillExists)
      } else if (fetchedGroups.length > 0) {
        await selectGroup(fetchedGroups[0])
      } else {
        setActiveGroupState(null)
        setActiveRole(null)
        apiService.setGroupId(null)
        // Clear stale persisted group
        try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups')
    } finally {
      setIsLoading(false)
    }
  }, [fetchGroups, activeGroup?.groupId, selectGroup, apiService])

  // Initial fetch when API becomes ready
  useEffect(() => {
    if (!isApiReady) return

    let cancelled = false

    const init = async () => {
      try {
        const fetchedGroups = await fetchGroups()
        if (cancelled) return

        setGroups(fetchedGroups)

        if (fetchedGroups.length === 0) {
          setIsLoading(false)
          return
        }

        // Restore persisted selection or prompt for group choice
        let savedId: string | null = null
        try {
          savedId = sessionStorage.getItem(STORAGE_KEY)
        } catch {
          // ignore
        }

        const savedGroup = savedId && fetchedGroups.find(g => g.groupId === savedId)

        if (savedGroup) {
          // Restore previously selected group
          if (!cancelled) await selectGroup(savedGroup)
        } else if (fetchedGroups.length === 1) {
          // Auto-select the only group
          if (!cancelled) await selectGroup(fetchedGroups[0])
        } else {
          // Multiple groups, no saved preference — prompt user to choose
          if (!cancelled) setNeedsGroupSelection(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch groups')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [isApiReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch groups when auth state changes (e.g., org switch in ExC Shell)
  const prevAuthRef = useRef({ token: ims.token, org: ims.org })
  useEffect(() => {
    const prev = prevAuthRef.current
    if (!isApiReady) return
    // Skip first render (handled by init effect above)
    if (prev.token === ims.token && prev.org === ims.org) return
    prevAuthRef.current = { token: ims.token, org: ims.org }
    refreshGroups()
  }, [ims.token, ims.org, isApiReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Register 403 stale-group recovery callback
  useEffect(() => {
    apiService.setOnStaleGroup(() => refreshGroups())
    return () => apiService.setOnStaleGroup(null)
  }, [apiService, refreshGroups])

  const value: GroupContextValue = {
    groups,
    activeGroup,
    activeRole,
    permissions,
    isLoading,
    error,
    groupVersion,
    needsGroupSelection,
    setActiveGroup,
    refreshGroups,
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export const useGroup = (): GroupContextValue => {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider')
  }
  return context
}
