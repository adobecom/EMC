/*
* <license header>
*
* Dashboard Data Source Registry
* Centralized configuration for which entities can be visualized in the
* Dashboards feature, and what dimensions/metrics each one exposes.
*
* Each data source normalizes its raw records to a common shape (epoch-ms
* `__ts` for time bucketing) so the aggregation engine never has to know
* about entity-specific field names or timestamp formats.
*/

import { apiService, cachedApi } from '../services/api'
import type { Aggregation } from '../types/dashboard'

export interface NormalizedRecord {
  __ts: number | null
  [key: string]: unknown
}

export interface DashboardDimension {
  field: string
  label: string
}

export interface DashboardMetric {
  field: string
  label: string
  aggregations: Aggregation[]
  /** Derives the numeric value from a normalized record. Defaults to `record[field]`. */
  compute?: (record: NormalizedRecord) => number | null
}

export interface DashboardDataSource {
  id: string
  label: string
  /** Always epoch ms after normalize() */
  timeField: string
  dimensions: DashboardDimension[]
  metrics: DashboardMetric[]
  fetch: () => Promise<Record<string, unknown>[]>
  normalize: (raw: Record<string, unknown>) => NormalizedRecord
}

function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const COUNT_METRIC: DashboardMetric = {
  field: 'count',
  label: 'Count',
  aggregations: ['count'],
}

// ============================================================================
// Series
// ============================================================================

const seriesDataSource: DashboardDataSource = {
  id: 'series',
  label: 'Series',
  timeField: '__ts',
  dimensions: [
    { field: 'scopeId', label: 'Scope' },
    { field: 'seriesStatus', label: 'Status' },
    { field: 'cloudType', label: 'Cloud' },
    { field: 'templateId', label: 'Template' },
    { field: 'createdBy', label: 'Created by' },
  ],
  metrics: [COUNT_METRIC],
  fetch: async () => (await cachedApi.getSeriesList()) as unknown as Record<string, unknown>[],
  normalize: (raw) => ({
    ...raw,
    __ts: toEpochMs(raw.creationTime),
  }),
}

// ============================================================================
// Events
// ============================================================================

const eventsDataSource: DashboardDataSource = {
  id: 'events',
  label: 'Events',
  timeField: '__ts',
  dimensions: [
    { field: 'eventType', label: 'Event type' },
    { field: 'cloudType', label: 'Cloud' },
    { field: 'seriesId', label: 'Series' },
    { field: 'published', label: 'Published' },
    { field: 'defaultLocale', label: 'Locale' },
    { field: 'createdBy', label: 'Created by' },
  ],
  metrics: [
    COUNT_METRIC,
    { field: 'attendeeCount', label: 'Attendee count', aggregations: ['sum', 'avg', 'min', 'max'] },
    { field: 'attendeeLimit', label: 'Attendee limit', aggregations: ['sum', 'avg', 'min', 'max'] },
    {
      field: 'attendeeRate',
      label: 'Attendance rate',
      aggregations: ['avg', 'min', 'max'],
      compute: (record) => {
        const count = record.attendeeCount
        const limit = record.attendeeLimit
        if (typeof count !== 'number' || typeof limit !== 'number' || limit <= 0) return null
        return count / limit
      },
    },
  ],
  fetch: async () => (await cachedApi.getEventsList()) as unknown as Record<string, unknown>[],
  normalize: (raw) => ({
    ...raw,
    __ts: toEpochMs(raw.creationTime),
  }),
}

// ============================================================================
// Platform Users (RBAC console users)
//
// There is no flat "all platform users" endpoint. Building this list requires
// a 3-level fan-out: platform-type scopes -> groups in each scope -> users in
// each group. Not wrapped by cachedApi (unlike series/events), so this
// re-fetches on every dashboard load — acceptable for the small number of
// platform-scope groups/users expected, but not cached like the other
// sources. `fetchAllPages` truncates at 100 pages per call; for very large
// orgs this could silently omit users, which is an accepted limitation.
// ============================================================================

interface StampedScopeUser extends Record<string, unknown> {
  scopeId: string
  groupId: string
  groupName: string
  roleId: string | null
}

async function fetchPlatformUsers(): Promise<Record<string, unknown>[]> {
  const scopes = await apiService.getScopes('platform')
  if ('error' in scopes) return []

  const groupsByScope = await Promise.all(
    scopes.map(async (scope) => {
      const groups = await apiService.getGroupsForScope(scope.scopeId)
      return 'error' in groups ? [] : groups.map((group) => ({ scope, group }))
    })
  )

  const scopeGroupPairs = groupsByScope.flat()

  const usersByGroup = await Promise.all(
    scopeGroupPairs.map(async ({ scope, group }): Promise<StampedScopeUser[]> => {
      const users = await apiService.getGroupUsers(scope.scopeId, group.groupId)
      if ('error' in users) return []
      return users.map((user) => ({
        ...user,
        scopeId: scope.scopeId,
        groupId: group.groupId,
        groupName: group.name,
        roleId: group.roleId,
      }))
    })
  )

  return usersByGroup.flat()
}

const platformUsersDataSource: DashboardDataSource = {
  id: 'platformUsers',
  label: 'Platform Users',
  timeField: '__ts',
  dimensions: [
    { field: 'groupName', label: 'Group' },
    { field: 'roleId', label: 'Role' },
    { field: 'scopeId', label: 'Scope' },
  ],
  metrics: [COUNT_METRIC],
  fetch: fetchPlatformUsers,
  normalize: (raw) => ({
    ...raw,
    __ts: toEpochMs(raw.creationTime),
  }),
}

// ============================================================================
// Registry
// ============================================================================

export const DASHBOARD_DATA_SOURCES: Record<string, DashboardDataSource> = {
  series: seriesDataSource,
  events: eventsDataSource,
  platformUsers: platformUsersDataSource,
}

export function getDashboardDataSource(id: string): DashboardDataSource | undefined {
  return DASHBOARD_DATA_SOURCES[id]
}

export function getDashboardDataSourceOptions(): Array<{ id: string; label: string }> {
  return Object.values(DASHBOARD_DATA_SOURCES).map(({ id, label }) => ({ id, label }))
}
