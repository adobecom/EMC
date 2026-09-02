/*
* <license header>
*
* Pure aggregation engine for the Dashboards feature. No React imports —
* keeps this trivially unit-testable and reusable from both the widget
* builder's live preview and the rendered dashboard canvas.
*/

import type { NormalizedRecord, DashboardDataSource } from '../config/dashboardDataSources'
import type { ChartType, DateRangeSpec, FilterClause, QuerySpec, TimeBucket } from '../types/dashboard'

export interface AggregatedPoint {
  label: string
  value: number
}

export interface AggregatedResult {
  chartType: ChartType
  points: AggregatedPoint[]
  statValue?: number
  rows?: Record<string, unknown>[]
}

export function resolveDateRange(spec: DateRangeSpec, now: number = Date.now()): { startMs: number; endMs: number } {
  if ('start' in spec) {
    return { startMs: Date.parse(spec.start), endMs: Date.parse(spec.end) }
  }

  if (spec.relative === 'allTime') {
    return { startMs: 0, endMs: now }
  }

  const months = spec.relative === 'last3Months' ? 3 : spec.relative === 'last6Months' ? 6 : 12
  return { startMs: subtractMonthsUtc(now, months), endMs: now }
}

/**
 * Subtracts months using UTC calendar fields (not local-time `setMonth`, which
 * can shift the date near timezone boundaries) and clamps the day so it never
 * overflows into the following month (e.g. Aug 31 - 6mo lands on Feb 28/29,
 * not rolls into March).
 */
function subtractMonthsUtc(ms: number, months: number): number {
  const date = new Date(ms)
  const targetMonthIndex = date.getUTCMonth() - months
  const year = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12)
  const month = ((targetMonthIndex % 12) + 12) % 12
  const daysInTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(date.getUTCDate(), daysInTargetMonth)
  return Date.UTC(
    year,
    month,
    day,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  )
}

/**
 * Filter values always arrive as strings (or string[] for `in`) from the widget
 * builder's TextField, regardless of the record field's actual runtime type
 * (e.g. `published` is a boolean). Coerce to the record field's type before
 * comparing — otherwise `true === "true"` etc. silently never matches.
 */
function coerceFilterValue(recordValue: unknown, filterValue: string | number): unknown {
  if (typeof recordValue === 'boolean') {
    return typeof filterValue === 'string' ? filterValue.toLowerCase() === 'true' : Boolean(filterValue)
  }
  if (typeof recordValue === 'number' && typeof filterValue === 'string') {
    const num = Number(filterValue)
    return Number.isNaN(num) ? filterValue : num
  }
  return filterValue
}

function matchesFilter(record: NormalizedRecord, filter: FilterClause): boolean {
  const value = record[filter.field]
  switch (filter.operator) {
    case 'eq':
      return !Array.isArray(filter.value) && value === coerceFilterValue(value, filter.value)
    case 'neq':
      return Array.isArray(filter.value) || value !== coerceFilterValue(value, filter.value)
    case 'gt': {
      if (Array.isArray(filter.value)) return false
      const coerced = coerceFilterValue(value, filter.value)
      return typeof value === 'number' && typeof coerced === 'number' && value > coerced
    }
    case 'lt': {
      if (Array.isArray(filter.value)) return false
      const coerced = coerceFilterValue(value, filter.value)
      return typeof value === 'number' && typeof coerced === 'number' && value < coerced
    }
    case 'in':
      return Array.isArray(filter.value) && filter.value.some((entry) => value === coerceFilterValue(value, entry))
    default:
      return true
  }
}

export function applyFilters(records: NormalizedRecord[], filters: FilterClause[]): NormalizedRecord[] {
  if (!filters.length) return records
  return records.filter((record) => filters.every((filter) => matchesFilter(record, filter)))
}

function bucketKey(ts: number, bucket: TimeBucket): string {
  const date = new Date(ts)
  if (bucket === 'day') return date.toISOString().slice(0, 10)
  if (bucket === 'month') return date.toISOString().slice(0, 7)

  // Week: Monday-start ISO week, keyed by the Monday's date
  const day = date.getUTCDay()
  const diffToMonday = (day === 0 ? -6 : 1) - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diffToMonday)
  return monday.toISOString().slice(0, 10)
}

export function bucketByTime(records: NormalizedRecord[], bucket: TimeBucket): Map<string, NormalizedRecord[]> {
  const groups = new Map<string, NormalizedRecord[]>()
  for (const record of records) {
    if (record.__ts === null) continue
    const key = bucketKey(record.__ts, bucket)
    const existing = groups.get(key)
    if (existing) existing.push(record)
    else groups.set(key, [record])
  }
  return groups
}

export function groupByDimension(records: NormalizedRecord[], field: string): Map<string, NormalizedRecord[]> {
  const groups = new Map<string, NormalizedRecord[]>()
  for (const record of records) {
    const rawValue = record[field]
    const key = rawValue === undefined || rawValue === null || rawValue === '' ? 'Unknown' : String(rawValue)
    const existing = groups.get(key)
    if (existing) existing.push(record)
    else groups.set(key, [record])
  }
  return groups
}

export function computeAggregation(
  records: NormalizedRecord[],
  metric: QuerySpec['metric'],
  dataSource: DashboardDataSource
): number {
  if (metric.aggregation === 'count') return records.length

  const metricDef = dataSource.metrics.find((m) => m.field === metric.field)
  const values: number[] = []
  for (const record of records) {
    const value = metricDef?.compute ? metricDef.compute(record) : record[metric.field]
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value)
  }
  if (values.length === 0) return 0

  switch (metric.aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    default:
      return 0
  }
}

/**
 * Cumulative time series: a running total as of each bucket (e.g. total platform
 * users over time), not a per-bucket count of new arrivals. Buckets ALL history up
 * to the window's end (not just records inside the window) so the running total
 * reflects the true cumulative headcount, then trims to buckets within the window
 * for display — each displayed point still carries the full running total.
 */
function buildCumulativeTimeSeries(
  fieldFiltered: NormalizedRecord[],
  query: QuerySpec,
  dataSource: DashboardDataSource,
  chartType: ChartType,
  now: number
): AggregatedResult {
  const timeBucket = query.timeBucket as TimeBucket
  const { startMs, endMs } = resolveDateRange(query.dateRange, now)
  const upToWindowEnd = fieldFiltered.filter((r) => r.__ts !== null && (r.__ts as number) <= endMs)
  const buckets = bucketByTime(upToWindowEnd, timeBucket)
  const sortedKeys = Array.from(buckets.keys()).sort()

  let runningTotal = 0
  const cumulativePoints: AggregatedPoint[] = sortedKeys.map((key) => {
    runningTotal += computeAggregation(buckets.get(key) ?? [], query.metric, dataSource)
    return { label: key, value: runningTotal }
  })

  // Compare by bucket key (not `Date.parse(point.label) >= startMs`) — `startMs` usually
  // falls mid-bucket (e.g. "3 months back" from a non-1st-of-month `now`), so comparing
  // against the bucket's own start timestamp would incorrectly drop the bucket the
  // window actually starts in.
  const startBucketKey = bucketKey(startMs, timeBucket)
  const visiblePoints = cumulativePoints.filter((point) => point.label >= startBucketKey)
  return { chartType, points: visiblePoints }
}

export function runQuery(
  records: Record<string, unknown>[],
  query: QuerySpec,
  dataSource: DashboardDataSource,
  chartType: ChartType,
  now: number = Date.now()
): AggregatedResult {
  const normalized = records.map(dataSource.normalize)
  const fieldFiltered = applyFilters(normalized, query.filters ?? [])

  if ((chartType === 'line' || chartType === 'bar') && query.timeBucket && query.cumulative) {
    return buildCumulativeTimeSeries(fieldFiltered, query, dataSource, chartType, now)
  }

  const { startMs, endMs } = resolveDateRange(query.dateRange, now)
  const inRange = fieldFiltered.filter(
    (record) => record.__ts !== null && (record.__ts as number) >= startMs && (record.__ts as number) <= endMs
  )

  if (chartType === 'stat') {
    return { chartType, points: [], statValue: computeAggregation(inRange, query.metric, dataSource) }
  }

  if (chartType === 'table') {
    return { chartType, points: [], rows: inRange }
  }

  let groups: Map<string, NormalizedRecord[]>
  if (query.timeBucket) {
    groups = bucketByTime(inRange, query.timeBucket)
  } else if (query.groupBy) {
    groups = groupByDimension(inRange, query.groupBy)
  } else {
    groups = new Map([['All', inRange]])
  }

  const points: AggregatedPoint[] = Array.from(groups.entries())
    .map(([label, groupRecords]) => ({
      label,
      value: computeAggregation(groupRecords, query.metric, dataSource),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return { chartType, points }
}
