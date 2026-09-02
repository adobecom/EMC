/*
* <license header>
*/

import React, { useEffect, useMemo } from 'react'
import { ActionButton, Text, Tooltip, TooltipTrigger } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Download from '@react-spectrum/s2/icons/Download'
import { DataTable, LoadingSpinner, StatTile, TrendBarChart, TrendLineChart } from '../../components/shared'
import type { TableColumn } from '../../components/shared'
import { Widget } from '../../types/dashboard'
import { getDashboardDataSource } from '../../config/dashboardDataSources'
import { AggregatedResult, runQuery } from '../../utils/dashboardAggregation'
import { useSafeState, useRBACFilter } from '../../hooks'
import { downloadCsv, exportDatetime, generateCsv, sanitizeFilename, CsvColumn } from '../../utils/csvExport'

interface WidgetPreviewProps {
  widget: Widget
  /** Categorical series color for line/bar charts (defaults to the shared brand blue). */
  color?: string
}

function getRowKey(row: Record<string, unknown>): string {
  const id = row.eventId ?? row.seriesId ?? row.email ?? row.userGuid
  return typeof id === 'string' ? id : JSON.stringify(row)
}

/** Shapes a widget's aggregated result into flat rows/columns for CSV export. */
function getExportData(
  widget: Widget,
  result: AggregatedResult
): { rows: Record<string, unknown>[]; columns: CsvColumn[] } {
  if (widget.chartType === 'stat') {
    return {
      rows: [{ metric: widget.title, value: result.statValue ?? 0 }],
      columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
    }
  }

  if (widget.chartType === 'table') {
    const rows = result.rows ?? []
    const columns: CsvColumn[] = Object.keys(rows[0] ?? {})
      .filter((key) => key !== '__ts')
      .map((key) => ({ key, label: key }))
    return { rows, columns }
  }

  return {
    rows: result.points.map((point) => ({ label: point.label, value: point.value })),
    columns: [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }],
  }
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({ widget, color }) => {
  const dataSource = getDashboardDataSource(widget.query.dataSource)
  const { filterEvents, filterSeries } = useRBACFilter()
  const [records, setRecords] = useSafeState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useSafeState<string | null>(null)

  useEffect(() => {
    if (!dataSource) return
    let cancelled = false
    setRecords(null)
    setError(null)

    dataSource
      .fetch()
      .then((raw) => {
        if (cancelled) return
        // Defense-in-depth: event:read/series:read are permission axes independent
        // of the page-level admin gate that gets a user onto this page at all.
        if (dataSource.id === 'events') setRecords(filterEvents(raw))
        else if (dataSource.id === 'series') setRecords(filterSeries(raw))
        else setRecords(raw)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load data for this widget.')
      })

    return () => {
      cancelled = true
    }
  }, [dataSource, filterEvents, filterSeries, setRecords, setError])

  const result = useMemo(() => {
    if (!dataSource || !records) return null
    return runQuery(records, widget.query, dataSource, widget.chartType)
  }, [dataSource, records, widget.query, widget.chartType])

  if (!dataSource) return <Text>Unknown data source.</Text>
  if (error) return <Text>{error}</Text>
  if (!result) return <LoadingSpinner />

  const handleExportCsv = () => {
    const { rows, columns } = getExportData(widget, result)
    const csv = generateCsv(rows, columns)
    downloadCsv(csv, `${sanitizeFilename(widget.title)}_${exportDatetime()}.csv`)
  }

  const exportButton = (
    <div className={style({ display: 'flex', justifyContent: 'end', marginBottom: 8 })}>
      <TooltipTrigger delay={0}>
        {/* no-print: global print-utility class (index.css), not expressible via the style macro */}
        <ActionButton isQuiet aria-label="Export widget data as CSV" onPress={handleExportCsv} UNSAFE_className="no-print">
          <Download />
        </ActionButton>
        <Tooltip>Export as CSV</Tooltip>
      </TooltipTrigger>
    </div>
  )

  if (widget.chartType === 'stat') {
    return (
      <div>
        {exportButton}
        <div role="img" aria-label={`${widget.title}: ${result.statValue ?? 0}`}>
          <StatTile title={widget.title} value={result.statValue ?? 0} />
        </div>
      </div>
    )
  }

  if (widget.chartType === 'table') {
    const rows = result.rows ?? []
    const columns: TableColumn<Record<string, unknown>>[] = Object.keys(rows[0] ?? {})
      .filter((key) => key !== '__ts')
      .slice(0, 6)
      .map((key) => ({ key, name: key, width: 160 }))

    return (
      <div>
        {exportButton}
        <DataTable columns={columns} data={rows} getItemKey={getRowKey} />
      </div>
    )
  }

  const chartLabel = `${widget.title} chart with ${result.points.length} data point${result.points.length === 1 ? '' : 's'}`

  return (
    <div>
      {exportButton}
      <div role="img" aria-label={chartLabel}>
        {widget.chartType === 'line' ? (
          <TrendLineChart data={result.points} color={color} />
        ) : (
          <TrendBarChart data={result.points} color={color} />
        )}
      </div>
    </div>
  )
}
