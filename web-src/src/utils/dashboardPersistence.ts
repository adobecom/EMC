/*
* <license header>
*/

import { ChartType, Dashboard, FilterClause, FilterOperator, Widget } from '../types/dashboard'

/**
 * localStorage utilities for persisting custom dashboards.
 *
 * Keyed per IMS account email (not per browser profile), so a shared
 * machine with multiple admins doesn't mix or overwrite each other's
 * dashboards. Data is stored in localStorage (unlike form drafts, which
 * use sessionStorage) so dashboards survive browser restarts.
 */

export const STORAGE_KEY_PREFIX = 'emc-dashboards-'
export const MAX_DASHBOARDS_PER_USER = 4

interface DashboardStorageEnvelope {
  dashboards: Dashboard[]
  version: 1
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function getStorageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}${normalizeEmail(email)}`
}

const CHART_TYPES: ChartType[] = ['line', 'bar', 'stat', 'table']
const FILTER_OPERATORS: FilterOperator[] = ['eq', 'neq', 'gt', 'lt', 'in']

function isValidFilterClause(value: unknown): value is FilterClause {
  if (!value || typeof value !== 'object') return false
  const filter = value as Partial<FilterClause>
  if (typeof filter.field !== 'string') return false
  if (typeof filter.operator !== 'string' || !FILTER_OPERATORS.includes(filter.operator as FilterOperator)) return false
  return (
    typeof filter.value === 'string' ||
    typeof filter.value === 'number' ||
    (Array.isArray(filter.value) && filter.value.every((entry) => typeof entry === 'string'))
  )
}

function isValidWidget(value: unknown): value is Widget {
  if (!value || typeof value !== 'object') return false
  const widget = value as Partial<Widget>
  return (
    typeof widget.id === 'string' &&
    typeof widget.title === 'string' &&
    typeof widget.chartType === 'string' &&
    CHART_TYPES.includes(widget.chartType as ChartType) &&
    !!widget.query &&
    typeof widget.query === 'object' &&
    typeof widget.query.dataSource === 'string' &&
    !!widget.query.metric &&
    typeof widget.query.metric.field === 'string' &&
    typeof widget.query.metric.aggregation === 'string' &&
    !!widget.query.dateRange &&
    (widget.query.filters === undefined ||
      (Array.isArray(widget.query.filters) && widget.query.filters.every(isValidFilterClause)))
  )
}

/** Rejects a whole dashboard if any part of its shape is malformed, so a corrupted
 *  or hand-edited localStorage blob can't crash runQuery/WidgetPreview downstream. */
function isValidDashboard(value: unknown): value is Dashboard {
  if (!value || typeof value !== 'object') return false
  const dashboard = value as Partial<Dashboard>
  return (
    typeof dashboard.id === 'string' &&
    typeof dashboard.name === 'string' &&
    typeof dashboard.createdAt === 'number' &&
    typeof dashboard.updatedAt === 'number' &&
    Array.isArray(dashboard.widgets) &&
    dashboard.widgets.every(isValidWidget)
  )
}

/**
 * Load the dashboards saved for an IMS account. Returns an empty array
 * (and self-heals by removing the key) if storage is missing, disabled,
 * or corrupt.
 */
export function loadDashboards(email: string): Dashboard[] {
  if (!email) return []

  try {
    const key = getStorageKey(email)
    const stored = localStorage.getItem(key)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!parsed || !Array.isArray(parsed.dashboards)) {
      console.warn('Invalid dashboard storage structure, discarding')
      localStorage.removeItem(key)
      return []
    }

    const validDashboards = parsed.dashboards.filter(isValidDashboard)
    if (validDashboards.length !== parsed.dashboards.length) {
      console.warn('Discarding malformed dashboard entries from local storage')
    }

    return validDashboards
  } catch (error) {
    console.warn('Failed to load dashboards from local storage:', error)
    return []
  }
}

/**
 * Save the full list of dashboards for an IMS account.
 */
export function saveDashboards(email: string, dashboards: Dashboard[]): void {
  if (!email) return

  try {
    const key = getStorageKey(email)
    const envelope: DashboardStorageEnvelope = { dashboards, version: 1 }
    localStorage.setItem(key, JSON.stringify(envelope))
  } catch (error) {
    // localStorage might be full or disabled
    console.warn('Failed to save dashboards to local storage:', error)
  }
}

/**
 * Clear all dashboards saved for an IMS account.
 */
export function clearDashboards(email: string): void {
  if (!email) return

  try {
    localStorage.removeItem(getStorageKey(email))
  } catch (error) {
    console.warn('Failed to clear dashboards from local storage:', error)
  }
}

export function isAtDashboardCap(dashboards: Dashboard[]): boolean {
  return dashboards.length >= MAX_DASHBOARDS_PER_USER
}
