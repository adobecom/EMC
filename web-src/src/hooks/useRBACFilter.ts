/**
 * useRBACFilter — provides filter functions that scope dashboard data
 * based on the current user's RBAC permissions.
 *
 * Admins see everything; non-admins see only items they have access to.
 */

import { useCallback } from 'react'
import { useRBAC } from '../contexts/RBACContext'

export function useRBACFilter() {
  const { isAdmin, canAccessEvent, canAccessSeries, canAccessCloud } = useRBAC()

  const filterEvents = useCallback(
    <T extends { eventId?: string; seriesId?: string; cloudType?: string }>(events: T[]): T[] => {
      if (isAdmin) return events
      return events.filter(e => canAccessEvent(e))
    },
    [isAdmin, canAccessEvent]
  )

  const filterSeries = useCallback(
    <T extends { seriesId?: string; cloudType?: string }>(series: T[]): T[] => {
      if (isAdmin) return series
      return series.filter(s => canAccessSeries(s))
    },
    [isAdmin, canAccessSeries]
  )

  const filterClouds = useCallback(
    <T extends { cloudType?: string }>(clouds: T[]): T[] => {
      if (isAdmin) return clouds
      return clouds.filter(c => canAccessCloud(c))
    },
    [isAdmin, canAccessCloud]
  )

  return { filterEvents, filterSeries, filterClouds }
}
