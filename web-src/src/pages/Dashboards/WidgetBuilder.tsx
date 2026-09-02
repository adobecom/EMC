/*
* <license header>
*/

import React, { useEffect, useMemo, useState } from 'react'
import {
  ActionButton,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  Picker,
  PickerItem,
  Switch,
  Text,
  TextField,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
// @ts-ignore - uuid types not installed
import { v4 as uuidv4 } from 'uuid'
import { useDashboard } from '../../contexts'
import {
  DASHBOARD_DATA_SOURCES,
  getDashboardDataSource,
} from '../../config/dashboardDataSources'
import {
  Aggregation,
  ChartType,
  FilterClause,
  FilterOperator,
  RelativeDateRangeKey,
  TimeBucket,
  Widget,
} from '../../types/dashboard'
import { WidgetPreview } from './WidgetPreview'

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'stat', label: 'Single stat' },
  { id: 'line', label: 'Line chart' },
  { id: 'bar', label: 'Bar chart' },
  { id: 'table', label: 'Table' },
]

const DATE_RANGES: { id: RelativeDateRangeKey; label: string }[] = [
  { id: 'last3Months', label: 'Last 3 months' },
  { id: 'last6Months', label: 'Last 6 months' },
  { id: 'last12Months', label: 'Last 12 months' },
  { id: 'allTime', label: 'All time' },
]

const TIME_BUCKETS: { id: TimeBucket; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

const FILTER_OPERATORS: { id: FilterOperator; label: string }[] = [
  { id: 'eq', label: 'is' },
  { id: 'neq', label: 'is not' },
  { id: 'gt', label: '>' },
  { id: 'lt', label: '<' },
  { id: 'in', label: 'is any of' },
]

const NONE = '__none__'

/** Filter row with a stable id for React keys — stripped before building the query. */
interface FilterRow extends FilterClause {
  rowId: string
}

function toFilterRows(filters: FilterClause[]): FilterRow[] {
  return filters.map((filter) => ({ ...filter, rowId: uuidv4() }))
}

function parseFilterValue(operator: FilterOperator, text: string): FilterClause['value'] {
  if (operator === 'in') {
    return text.split(',').map((v) => v.trim()).filter(Boolean)
  }
  if (operator === 'gt' || operator === 'lt') {
    const num = Number(text)
    return Number.isNaN(num) ? text : num
  }
  return text
}

function filterValueToText(value: FilterClause['value']): string {
  return Array.isArray(value) ? value.join(', ') : String(value)
}

interface WidgetFormState {
  title: string
  dataSourceId: string
  chartType: ChartType
  metricField: string
  aggregation: Aggregation
  groupBy: string
  timeBucket: TimeBucket | typeof NONE
  cumulative: boolean
  dateRange: RelativeDateRangeKey
  filters: FilterRow[]
}

function computeInitialFormState(widget?: Widget): WidgetFormState {
  return {
    title: widget?.title ?? 'Untitled widget',
    dataSourceId: widget?.query.dataSource ?? 'events',
    chartType: widget?.chartType ?? 'stat',
    metricField: widget?.query.metric.field ?? 'count',
    aggregation: widget?.query.metric.aggregation ?? 'count',
    groupBy: widget?.query.groupBy ?? NONE,
    timeBucket: widget?.query.timeBucket ?? NONE,
    cumulative: widget?.query.cumulative ?? false,
    dateRange:
      widget?.query.dateRange && 'relative' in widget.query.dateRange
        ? widget.query.dateRange.relative
        : 'last3Months',
    filters: toFilterRows(widget?.query.filters ?? []),
  }
}

interface WidgetBuilderProps {
  dashboardId: string
  widget?: Widget
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const WidgetBuilder: React.FC<WidgetBuilderProps> = ({ dashboardId, widget, isOpen, onOpenChange }) => {
  const { addWidget, updateWidget } = useDashboard()

  const [title, setTitle] = useState(() => computeInitialFormState(widget).title)
  const [dataSourceId, setDataSourceId] = useState(() => computeInitialFormState(widget).dataSourceId)
  const [chartType, setChartType] = useState<ChartType>(() => computeInitialFormState(widget).chartType)
  const [metricField, setMetricField] = useState(() => computeInitialFormState(widget).metricField)
  const [aggregation, setAggregation] = useState<Aggregation>(() => computeInitialFormState(widget).aggregation)
  const [groupBy, setGroupBy] = useState(() => computeInitialFormState(widget).groupBy)
  const [timeBucket, setTimeBucket] = useState<TimeBucket | typeof NONE>(() => computeInitialFormState(widget).timeBucket)
  const [cumulative, setCumulative] = useState(() => computeInitialFormState(widget).cumulative)
  const [dateRange, setDateRange] = useState<RelativeDateRangeKey>(() => computeInitialFormState(widget).dateRange)
  const [filters, setFilters] = useState<FilterRow[]>(() => computeInitialFormState(widget).filters)

  // WidgetBuilder is mounted unconditionally by DashboardCanvas so the Dialog's open/close
  // animation plays correctly. Since it no longer remounts on open, reset every field from
  // `widget` whenever the dialog transitions to open — this also correctly handles reopening
  // the SAME widget after a previous open+cancel, since `isOpen` is itself a dependency.
  useEffect(() => {
    if (!isOpen) return
    const initial = computeInitialFormState(widget)
    setTitle(initial.title)
    setDataSourceId(initial.dataSourceId)
    setChartType(initial.chartType)
    setMetricField(initial.metricField)
    setAggregation(initial.aggregation)
    setGroupBy(initial.groupBy)
    setTimeBucket(initial.timeBucket)
    setCumulative(initial.cumulative)
    setDateRange(initial.dateRange)
    setFilters(initial.filters)
  }, [isOpen, widget])

  const dataSource = getDashboardDataSource(dataSourceId)
  const selectedMetric = dataSource?.metrics.find((m) => m.field === metricField) ?? dataSource?.metrics[0]

  const draft: Widget = useMemo(
    () => ({
      id: widget?.id ?? 'preview',
      title: title || 'Untitled widget',
      chartType,
      query: {
        dataSource: dataSourceId,
        metric: { field: selectedMetric?.field ?? 'count', aggregation },
        groupBy: groupBy === NONE ? undefined : groupBy,
        timeBucket: timeBucket === NONE ? undefined : timeBucket,
        cumulative: timeBucket !== NONE && cumulative,
        dateRange: { relative: dateRange },
        filters: filters.map((filter) => ({ field: filter.field, operator: filter.operator, value: filter.value })),
      },
    }),
    [widget?.id, title, chartType, dataSourceId, selectedMetric?.field, aggregation, groupBy, timeBucket, cumulative, dateRange, filters]
  )

  const handleDataSourceChange = (id: string) => {
    setDataSourceId(id)
    const nextSource = getDashboardDataSource(id)
    setMetricField(nextSource?.metrics[0]?.field ?? 'count')
    setAggregation(nextSource?.metrics[0]?.aggregations[0] ?? 'count')
    setGroupBy(NONE)
    setFilters([])
  }

  const handleMetricChange = (field: string) => {
    setMetricField(field)
    const metric = dataSource?.metrics.find((m) => m.field === field)
    if (metric && !metric.aggregations.includes(aggregation)) {
      setAggregation(metric.aggregations[0])
    }
  }

  const addFilter = () => {
    const firstField = dataSource?.dimensions[0]?.field ?? ''
    setFilters([...filters, { rowId: uuidv4(), field: firstField, operator: 'eq', value: '' }])
  }

  const updateFilter = (rowId: string, patch: Partial<FilterClause>) => {
    setFilters(filters.map((filter) => (filter.rowId === rowId ? { ...filter, ...patch } : filter)))
  }

  const removeFilter = (rowId: string) => {
    setFilters(filters.filter((filter) => filter.rowId !== rowId))
  }

  const handleSave = (close: () => void) => {
    if (widget) {
      updateWidget(dashboardId, draft)
    } else {
      addWidget(dashboardId, { title: draft.title, chartType: draft.chartType, query: draft.query })
    }
    close()
  }

  const showGroupingControls = chartType === 'line' || chartType === 'bar'
  // Tables need real horizontal room for their columns — stack the preview full-width
  // below the form instead of squeezing it into a half-width column like the other chart types.
  const isTablePreview = chartType === 'table'
  const formGridClassName = isTablePreview
    ? style({ display: 'grid', gridTemplateColumns: '1fr', gap: 24, minWidth: 0 })
    : style({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minWidth: 0 })
  const previewPane = (
    <div className={style({ minWidth: 0, overflow: 'hidden' })}>
      <Text UNSAFE_style={{ fontWeight: 600, fontSize: 14 }}>Preview</Text>
      <div className={style({ marginTop: 12, minWidth: 0, overflow: 'auto' })}>
        <WidgetPreview widget={draft} />
      </div>
    </div>
  )

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <div style={{ display: 'none' }} />
      <Dialog size="XL">
        {({ close }) => (
          <>
            <Heading slot="title">{widget ? 'Edit widget' : 'Add widget'}</Heading>
            <Content>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 })}>
        <div className={formGridClassName}>
          <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 })}>
            <TextField label="Title" value={title} onChange={setTitle} styles={style({ width: '[100%]' })} autoFocus />

            <Picker
              label="Data source"
              selectedKey={dataSourceId}
              onSelectionChange={(key) => handleDataSourceChange(key as string)}
              styles={style({ width: '[100%]' })}
            >
              {Object.values(DASHBOARD_DATA_SOURCES).map((source) => (
                <PickerItem key={source.id} id={source.id}>{source.label}</PickerItem>
              ))}
            </Picker>

            <Picker
              label="Chart type"
              selectedKey={chartType}
              onSelectionChange={(key) => setChartType(key as ChartType)}
              styles={style({ width: '[100%]' })}
            >
              {CHART_TYPES.map((ct) => (
                <PickerItem key={ct.id} id={ct.id}>{ct.label}</PickerItem>
              ))}
            </Picker>

            <div className={style({ display: 'flex', gap: 12 })}>
              <Picker
                label="Metric"
                selectedKey={metricField}
                onSelectionChange={(key) => handleMetricChange(key as string)}
                styles={style({ width: '[100%]' })}
              >
                {(dataSource?.metrics ?? []).map((metric) => (
                  <PickerItem key={metric.field} id={metric.field}>{metric.label}</PickerItem>
                ))}
              </Picker>
              <Picker
                label="Aggregation"
                selectedKey={aggregation}
                onSelectionChange={(key) => setAggregation(key as Aggregation)}
                styles={style({ width: '[100%]' })}
              >
                {(selectedMetric?.aggregations ?? []).map((agg) => (
                  <PickerItem key={agg} id={agg}>{agg}</PickerItem>
                ))}
              </Picker>
            </div>

            {showGroupingControls && (
              <div className={style({ display: 'flex', gap: 12 })}>
                <Picker
                  label="Group by"
                  selectedKey={groupBy}
                  onSelectionChange={(key) => setGroupBy(key as string)}
                  styles={style({ width: '[100%]' })}
                >
                  <PickerItem id={NONE}>None</PickerItem>
                  {(dataSource?.dimensions ?? []).map((dim) => (
                    <PickerItem key={dim.field} id={dim.field}>{dim.label}</PickerItem>
                  ))}
                </Picker>
                <Picker
                  label="Bucket by time"
                  selectedKey={timeBucket}
                  onSelectionChange={(key) => setTimeBucket(key as TimeBucket | typeof NONE)}
                  styles={style({ width: '[100%]' })}
                >
                  <PickerItem id={NONE}>None</PickerItem>
                  {TIME_BUCKETS.map((bucket) => (
                    <PickerItem key={bucket.id} id={bucket.id}>{bucket.label}</PickerItem>
                  ))}
                </Picker>
              </div>
            )}

            {showGroupingControls && timeBucket !== NONE && (
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                <Switch isSelected={cumulative} onChange={setCumulative}>
                  Show running total (cumulative)
                </Switch>
                <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
                  {cumulative
                    ? 'Each point is the total as of that period (e.g. total users to date) — always non-decreasing.'
                    : 'Each point is the count added within that period only (e.g. new users that month).'}
                </Text>
              </div>
            )}

            <Picker
              label="Date range"
              selectedKey={dateRange}
              onSelectionChange={(key) => setDateRange(key as RelativeDateRangeKey)}
              styles={style({ width: '[100%]' })}
            >
              {DATE_RANGES.map((range) => (
                <PickerItem key={range.id} id={range.id}>{range.label}</PickerItem>
              ))}
            </Picker>

            <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
              <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                <Text UNSAFE_style={{ fontWeight: 600, fontSize: 14 }}>Filters</Text>
                <ActionButton isQuiet aria-label="Add filter" onPress={addFilter}>
                  <Add />
                </ActionButton>
              </div>
              {filters.map((filter) => (
                <div key={filter.rowId} className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                  <div className={style({ display: 'flex', gap: 8 })}>
                    <Picker
                      label="Field"
                      selectedKey={filter.field}
                      onSelectionChange={(key) => updateFilter(filter.rowId, { field: key as string })}
                      isDisabled={!dataSource?.dimensions.length}
                      styles={style({ width: '[100%]' })}
                    >
                      {(dataSource?.dimensions ?? []).map((dim) => (
                        <PickerItem key={dim.field} id={dim.field}>{dim.label}</PickerItem>
                      ))}
                    </Picker>
                    <Picker
                      label="Operator"
                      selectedKey={filter.operator}
                      onSelectionChange={(key) => {
                        const operator = key as FilterOperator
                        updateFilter(filter.rowId, { operator, value: parseFilterValue(operator, filterValueToText(filter.value)) })
                      }}
                      styles={style({ width: '[100%]' })}
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <PickerItem key={op.id} id={op.id}>{op.label}</PickerItem>
                      ))}
                    </Picker>
                  </div>
                  {!dataSource?.dimensions.length && (
                    <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
                      This data source has no filterable fields.
                    </Text>
                  )}
                  <div className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                    <TextField
                      label="Value"
                      description={filter.operator === 'in' ? 'Comma-separated' : undefined}
                      value={filterValueToText(filter.value)}
                      onChange={(text) => updateFilter(filter.rowId, { value: parseFilterValue(filter.operator, text) })}
                      styles={style({ width: '[100%]' })}
                    />
                    <ActionButton isQuiet aria-label="Remove filter" onPress={() => removeFilter(filter.rowId)}>
                      <RemoveCircle />
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isTablePreview && previewPane}
        </div>

        {isTablePreview && previewPane}
        </div>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>Cancel</Button>
              <Button variant="accent" onPress={() => handleSave(close)}>
                {widget ? 'Update' : 'Add widget'}
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  )
}
