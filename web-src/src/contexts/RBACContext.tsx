/**
 * RBACContext — Authorization layer (separate from AuthContext which handles authentication).
 *
 * Reads users.json (static import) and matches the current IMS profile email
 * to determine the user's role and scope. Admins bypass all scope checks.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import type { RBACUser, RBACScope, RBACContextValue, UserRole } from '../types/rbac'
import usersData from '../config/users.json'

// ============================================================================
// Helpers
// ============================================================================

function parseCommaSeparated(value: string | undefined | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function buildUsersFromJson(data: typeof usersData): RBACUser[] {
  return (data.data || []).map((row: Record<string, unknown>) => ({
    email: String(row.email || '').toLowerCase().trim(),
    role: (String(row.role || 'editor') as UserRole),
    businessUnits: parseCommaSeparated(row['business-units'] as string),
    series: parseCommaSeparated(row.series as string),
    events: parseCommaSeparated(row.events as string),
  }))
}

function buildScope(user: RBACUser): RBACScope {
  return {
    cloudTypes: new Set(user.businessUnits),
    seriesIds: new Set(user.series),
    eventIds: new Set(user.events),
  }
}

const EMPTY_SCOPE: RBACScope = {
  cloudTypes: new Set(),
  seriesIds: new Set(),
  eventIds: new Set(),
}

// ============================================================================
// Context
// ============================================================================

const RBACContext = createContext<RBACContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

interface RBACProviderProps {
  children: ReactNode
}

export const RBACProvider: React.FC<RBACProviderProps> = ({ children }) => {
  const { ims } = useAuth()
  const [users, setUsers] = useState<RBACUser[]>(() => buildUsersFromJson(usersData))
  const [isLoading, setIsLoading] = useState(true)

  const currentEmail = ims.profile?.email?.toLowerCase().trim() || ''

  const currentUser = useMemo(
    () => users.find(u => u.email === currentEmail),
    [users, currentEmail]
  )

  const isAdmin = currentUser?.role === 'admin'
  const hasAccess = !!currentUser

  const scope = useMemo(
    () => (currentUser ? buildScope(currentUser) : EMPTY_SCOPE),
    [currentUser]
  )

  // Mark loading complete once we have resolved the user
  useEffect(() => {
    if (currentEmail) {
      setIsLoading(false)
    }
  }, [currentEmail])

  const canAccessEvent = useCallback(
    (event: { eventId?: string; seriesId?: string; cloudType?: string }) => {
      if (isAdmin) return true
      if (!hasAccess) return false
      if (event.eventId && scope.eventIds.has(event.eventId)) return true
      if (event.seriesId && scope.seriesIds.has(event.seriesId)) return true
      if (event.cloudType && scope.cloudTypes.has(event.cloudType)) return true
      // Empty scope for non-admins = no access
      return false
    },
    [isAdmin, hasAccess, scope]
  )

  const canAccessSeries = useCallback(
    (series: { seriesId?: string; cloudType?: string }) => {
      if (isAdmin) return true
      if (!hasAccess) return false
      if (series.seriesId && scope.seriesIds.has(series.seriesId)) return true
      if (series.cloudType && scope.cloudTypes.has(series.cloudType)) return true
      return false
    },
    [isAdmin, hasAccess, scope]
  )

  const canAccessCloud = useCallback(
    (cloud: { cloudType?: string }) => {
      if (isAdmin) return true
      if (!hasAccess) return false
      if (cloud.cloudType && scope.cloudTypes.has(cloud.cloudType)) return true
      return false
    },
    [isAdmin, hasAccess, scope]
  )

  const allUsers = useMemo(
    () => (isAdmin ? users : []),
    [isAdmin, users]
  )

  const refreshUsers = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('emc_github_pat')
      if (!token) return

      const response = await fetch(
        'https://api.github.com/repos/adobecom/EMC/contents/web-src/src/config/users.json?ref=main',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!response.ok) return

      const fileData = await response.json()
      const content = JSON.parse(atob(fileData.content))
      setUsers(buildUsersFromJson(content))
    } catch (err) {
      console.error('Failed to refresh users from GitHub:', err)
    }
  }, [])

  const value: RBACContextValue = {
    currentUser,
    isAdmin,
    isLoading,
    hasAccess,
    scope,
    canAccessEvent,
    canAccessSeries,
    canAccessCloud,
    allUsers,
    refreshUsers,
  }

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export const useRBAC = (): RBACContextValue => {
  const context = useContext(RBACContext)
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider')
  }
  return context
}
