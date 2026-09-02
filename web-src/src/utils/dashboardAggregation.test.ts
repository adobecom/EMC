/*
* <license header>
*/

import {
  applyFilters,
  bucketByTime,
  computeAggregation,
  groupByDimension,
  resolveDateRange,
  runQuery,
} from './dashboardAggregation'
import type { DashboardDataSource, NormalizedRecord } from '../config/dashboardDataSources'
import type { FilterClause, QuerySpec } from '../types/dashboard'

const NOW = Date.parse('2026-09-01T00:00:00.000Z')

function record(overrides: Partial<NormalizedRecord> & { __ts: number | null }): NormalizedRecord {
  return { ...overrides }
}

const testDataSource: DashboardDataSource = {
  id: 'events',
  label: 'Events',
  timeField: '__ts',
  dimensions: [{ field: 'eventType', label: 'Event type' }],
  metrics: [
    { field: 'count', label: 'Count', aggregations: ['count'] },
    { field: 'attendeeCount', label: 'Attendee count', aggregations: ['sum', 'avg', 'min', 'max'] },
    { field: 'attendeeLimit', label: 'Attendee limit', aggregations: ['sum', 'avg', 'min', 'max'] },
    {
      field: 'attendeeRate',
      label: 'Attendance rate',
      aggregations: ['avg'],
      compute: (r) => {
        const count = r.attendeeCount
        const limit = r.attendeeLimit
        if (typeof count !== 'number' || typeof limit !== 'number' || limit <= 0) return null
        return count / limit
      },
    },
  ],
  fetch: async () => [],
  normalize: (raw) => raw as NormalizedRecord,
}

describe('resolveDateRange', () => {
  it('resolves an absolute range from start/end', () => {
    const { startMs, endMs } = resolveDateRange({ start: '2026-01-01', end: '2026-02-01' }, NOW)
    expect(startMs).toBe(Date.parse('2026-01-01'))
    expect(endMs).toBe(Date.parse('2026-02-01'))
  })

  it('resolves last3Months relative to the injected now', () => {
    const { startMs, endMs } = resolveDateRange({ relative: 'last3Months' }, NOW)
    expect(endMs).toBe(NOW)
    expect(startMs).toBe(Date.parse('2026-06-01T00:00:00.000Z'))
  })

  it('resolves last6Months relative to the injected now', () => {
    const { startMs } = resolveDateRange({ relative: 'last6Months' }, NOW)
    expect(startMs).toBe(Date.parse('2026-03-01T00:00:00.000Z'))
  })

  it('resolves last12Months relative to the injected now', () => {
    const { startMs } = resolveDateRange({ relative: 'last12Months' }, NOW)
    expect(startMs).toBe(Date.parse('2025-09-01T00:00:00.000Z'))
  })

  it('resolves allTime as epoch 0 through now', () => {
    const { startMs, endMs } = resolveDateRange({ relative: 'allTime' }, NOW)
    expect(startMs).toBe(0)
    expect(endMs).toBe(NOW)
  })

  it('clamps day-of-month instead of overflowing into the next month (Aug 31 - 6mo)', () => {
    const aug31 = Date.parse('2026-08-31T00:00:00.000Z')
    const { startMs } = resolveDateRange({ relative: 'last6Months' }, aug31)
    expect(startMs).toBe(Date.parse('2026-02-28T00:00:00.000Z'))
  })
})

describe('applyFilters', () => {
  const records = [
    record({ __ts: 1, eventType: 'webinar' }),
    record({ __ts: 2, eventType: 'in-person' }),
    record({ __ts: 3, attendeeCount: 10 }),
  ]

  it('returns all records when no filters are given', () => {
    expect(applyFilters(records, [])).toHaveLength(3)
  })

  it('filters with eq', () => {
    const filter: FilterClause = { field: 'eventType', operator: 'eq', value: 'webinar' }
    expect(applyFilters(records, [filter])).toEqual([records[0]])
  })

  it('filters with neq', () => {
    const filter: FilterClause = { field: 'eventType', operator: 'neq', value: 'webinar' }
    expect(applyFilters(records, [filter])).toHaveLength(2)
  })

  it('filters with gt', () => {
    const filter: FilterClause = { field: 'attendeeCount', operator: 'gt', value: 5 }
    expect(applyFilters(records, [filter])).toEqual([records[2]])
  })

  it('filters with lt', () => {
    const filter: FilterClause = { field: 'attendeeCount', operator: 'lt', value: 5 }
    expect(applyFilters(records, [filter])).toEqual([])
  })

  it('filters with in', () => {
    const filter: FilterClause = { field: 'eventType', operator: 'in', value: ['webinar', 'in-person'] }
    expect(applyFilters(records, [filter])).toHaveLength(2)
  })

  it('coerces string filter values against boolean fields (widget builder always sends strings)', () => {
    const booleanRecords = [record({ __ts: 1, published: true }), record({ __ts: 2, published: false })]
    expect(applyFilters(booleanRecords, [{ field: 'published', operator: 'eq', value: 'true' }])).toEqual([booleanRecords[0]])
    expect(applyFilters(booleanRecords, [{ field: 'published', operator: 'neq', value: 'true' }])).toEqual([booleanRecords[1]])
    expect(applyFilters(booleanRecords, [{ field: 'published', operator: 'in', value: ['false'] }])).toEqual([booleanRecords[1]])
  })
})

describe('bucketByTime', () => {
  it('buckets by day', () => {
    const records = [record({ __ts: Date.parse('2026-01-01T05:00:00Z') }), record({ __ts: Date.parse('2026-01-01T20:00:00Z') })]
    const buckets = bucketByTime(records, 'day')
    expect(buckets.size).toBe(1)
    expect(buckets.get('2026-01-01')).toHaveLength(2)
  })

  it('buckets by month', () => {
    const records = [record({ __ts: Date.parse('2026-01-05') }), record({ __ts: Date.parse('2026-01-25') }), record({ __ts: Date.parse('2026-02-01') })]
    const buckets = bucketByTime(records, 'month')
    expect(buckets.get('2026-01')).toHaveLength(2)
    expect(buckets.get('2026-02')).toHaveLength(1)
  })

  it('buckets by week starting Monday', () => {
    // 2026-01-05 is a Monday, 2026-01-06 is a Tuesday in the same ISO week
    const records = [record({ __ts: Date.parse('2026-01-05') }), record({ __ts: Date.parse('2026-01-06') })]
    const buckets = bucketByTime(records, 'week')
    expect(buckets.size).toBe(1)
    expect(buckets.has('2026-01-05')).toBe(true)
  })

  it('excludes records with a null timestamp', () => {
    const buckets = bucketByTime([record({ __ts: null })], 'day')
    expect(buckets.size).toBe(0)
  })
})

describe('groupByDimension', () => {
  it('groups by field value, bucketing missing values under Unknown', () => {
    const records = [record({ __ts: 1, eventType: 'webinar' }), record({ __ts: 2, eventType: 'webinar' }), record({ __ts: 3 })]
    const groups = groupByDimension(records, 'eventType')
    expect(groups.get('webinar')).toHaveLength(2)
    expect(groups.get('Unknown')).toHaveLength(1)
  })
})

describe('computeAggregation', () => {
  const records = [
    record({ __ts: 1, attendeeCount: 10, attendeeLimit: 20 }),
    record({ __ts: 2, attendeeCount: 30, attendeeLimit: 30 }),
  ]

  it('counts records regardless of field', () => {
    expect(computeAggregation(records, { field: 'count', aggregation: 'count' }, testDataSource)).toBe(2)
  })

  it('sums a metric', () => {
    expect(computeAggregation(records, { field: 'attendeeCount', aggregation: 'sum' }, testDataSource)).toBe(40)
  })

  it('averages a metric', () => {
    expect(computeAggregation(records, { field: 'attendeeCount', aggregation: 'avg' }, testDataSource)).toBe(20)
  })

  it('takes the min of a metric', () => {
    expect(computeAggregation(records, { field: 'attendeeCount', aggregation: 'min' }, testDataSource)).toBe(10)
  })

  it('takes the max of a metric', () => {
    expect(computeAggregation(records, { field: 'attendeeCount', aggregation: 'max' }, testDataSource)).toBe(30)
  })

  it('averages a computed metric (attendeeRate)', () => {
    expect(computeAggregation(records, { field: 'attendeeRate', aggregation: 'avg' }, testDataSource)).toBe(0.75)
  })

  it('guards divide-by-zero in the computed metric by excluding the record', () => {
    const withZeroLimit = [...records, record({ __ts: 3, attendeeCount: 5, attendeeLimit: 0 })]
    expect(computeAggregation(withZeroLimit, { field: 'attendeeRate', aggregation: 'avg' }, testDataSource)).toBe(0.75)
  })

  it('returns 0 when no records have a usable value', () => {
    expect(computeAggregation([record({ __ts: 1 })], { field: 'attendeeCount', aggregation: 'sum' }, testDataSource)).toBe(0)
  })
})

describe('runQuery', () => {
  const rawRecords: Record<string, unknown>[] = [
    { __ts: Date.parse('2026-08-01'), eventType: 'webinar', attendeeCount: 10, attendeeLimit: 20 },
    { __ts: Date.parse('2026-08-15'), eventType: 'in-person', attendeeCount: 15, attendeeLimit: 20 },
    { __ts: Date.parse('2020-01-01'), eventType: 'webinar', attendeeCount: 1, attendeeLimit: 100 },
  ]

  const baseQuery: QuerySpec = {
    dataSource: 'events',
    metric: { field: 'count', aggregation: 'count' },
    dateRange: { relative: 'last3Months' },
  }

  it('produces a stat result', () => {
    const result = runQuery(rawRecords, baseQuery, testDataSource, 'stat', NOW)
    expect(result.statValue).toBe(2) // 2020 record excluded by date range
  })

  it('produces a table result with in-range rows only', () => {
    const result = runQuery(rawRecords, baseQuery, testDataSource, 'table', NOW)
    expect(result.rows).toHaveLength(2)
  })

  it('produces grouped bar/line points by dimension', () => {
    const query: QuerySpec = { ...baseQuery, groupBy: 'eventType' }
    const result = runQuery(rawRecords, query, testDataSource, 'bar', NOW)
    expect(result.points).toEqual([
      { label: 'in-person', value: 1 },
      { label: 'webinar', value: 1 },
    ])
  })

  it('produces time-bucketed points when timeBucket is set', () => {
    const query: QuerySpec = { ...baseQuery, timeBucket: 'month' }
    const result = runQuery(rawRecords, query, testDataSource, 'line', NOW)
    expect(result.points).toEqual([{ label: '2026-08', value: 2 }])
  })

  describe('cumulative time series', () => {
    const growthRecords: Record<string, unknown>[] = [
      { __ts: Date.parse('2020-01-01') }, // long before the window — still counts toward the running total
      { __ts: Date.parse('2026-06-10') },
      { __ts: Date.parse('2026-06-20') },
      { __ts: Date.parse('2026-07-05') },
      { __ts: Date.parse('2026-08-01') },
    ]

    it('is a running total, not a per-bucket count, so it never decreases', () => {
      const query: QuerySpec = {
        dataSource: 'events',
        metric: { field: 'count', aggregation: 'count' },
        dateRange: { relative: 'last3Months' },
        timeBucket: 'month',
        cumulative: true,
      }
      const result = runQuery(growthRecords, query, testDataSource, 'line', NOW)
      // 3 records exist by end of June (1 pre-window + 2 in June), 4 by end of July, 5 by end of August
      expect(result.points).toEqual([
        { label: '2026-06', value: 3 },
        { label: '2026-07', value: 4 },
        { label: '2026-08', value: 5 },
      ])
    })

    it('differs from the non-cumulative per-bucket count for the same data', () => {
      const query: QuerySpec = {
        dataSource: 'events',
        metric: { field: 'count', aggregation: 'count' },
        dateRange: { relative: 'last3Months' },
        timeBucket: 'month',
        cumulative: false,
      }
      const result = runQuery(growthRecords, query, testDataSource, 'line', NOW)
      expect(result.points).toEqual([
        { label: '2026-06', value: 2 },
        { label: '2026-07', value: 1 },
        { label: '2026-08', value: 1 },
      ])
    })

    it('does not drop the bucket the window starts in when `now` falls mid-bucket', () => {
      // NOW here is mid-month, so "last3Months" starts mid-June, not on a bucket boundary —
      // the June bucket (label "2026-06", parsed as June 1) must still be visible.
      const midMonthNow = Date.parse('2026-09-15T00:00:00.000Z')
      const query: QuerySpec = {
        dataSource: 'events',
        metric: { field: 'count', aggregation: 'count' },
        dateRange: { relative: 'last3Months' },
        timeBucket: 'month',
        cumulative: true,
      }
      const result = runQuery(growthRecords, query, testDataSource, 'line', midMonthNow)
      expect(result.points.map((p) => p.label)).toEqual(['2026-06', '2026-07', '2026-08'])
    })

    it('ignores cumulative for stat/table chart types', () => {
      const query: QuerySpec = {
        dataSource: 'events',
        metric: { field: 'count', aggregation: 'count' },
        dateRange: { relative: 'last3Months' },
        timeBucket: 'month',
        cumulative: true,
      }
      const result = runQuery(growthRecords, query, testDataSource, 'stat', NOW)
      expect(result.statValue).toBe(4) // per-window count, not a running total
    })
  })
})
