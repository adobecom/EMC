/*
* <license header>
*/

/**
 * Custom Dashboards feature types
 */

export type ChartType = 'line' | 'bar' | 'stat' | 'table'

export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type TimeBucket = 'day' | 'week' | 'month'

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'in'

export interface FilterClause {
  field: string
  operator: FilterOperator
  value: string | number | string[]
}

export interface AbsoluteDateRange {
  start: string
  end: string
}

export type RelativeDateRangeKey = 'last3Months' | 'last6Months' | 'last12Months' | 'allTime'

export interface RelativeDateRange {
  relative: RelativeDateRangeKey
}

export type DateRangeSpec = AbsoluteDateRange | RelativeDateRange

export interface QuerySpec {
  dataSource: string
  metric: {
    field: string
    aggregation: Aggregation
  }
  groupBy?: string
  timeBucket?: TimeBucket
  /** Running total across time buckets (e.g. total users over time) instead of a per-bucket count. Only meaningful with `timeBucket` set. */
  cumulative?: boolean
  dateRange: DateRangeSpec
  filters?: FilterClause[]
}

export interface Widget {
  id: string
  title: string
  chartType: ChartType
  query: QuerySpec
}

export interface Dashboard {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  widgets: Widget[]
}
