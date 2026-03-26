/**
 * useRBACFilter — provides filter functions that scope dashboard data
 * based on the active group's RBAC permissions.
 *
 * Legacy ESP routes do not yet enforce RBAC server-side, so client-side
 * filtering is still needed. Filtering is at the resource-type level:
 * if the user has event:read, they see all events; if not, they see none.
 */

import { useCallback } from 'react'
import { useGroup } from '../contexts/GroupContext'
import { checkPermission } from './useHasPermission'

export function useRBACFilter() {
  const { permissions } = useGroup()

  const filterEvents = useCallback(
    <T>(events: T[]): T[] => {
      if (checkPermission(permissions, 'event', 'read')) return events
      return []
    },
    [permissions]
  )

  const filterSeries = useCallback(
    <T>(series: T[]): T[] => {
      if (checkPermission(permissions, 'series', 'read')) return series
      return []
    },
    [permissions]
  )

  return { filterEvents, filterSeries }
}
