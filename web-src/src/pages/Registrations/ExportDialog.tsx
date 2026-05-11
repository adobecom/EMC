/**
 * ExportDialog — Lets admins export attendee data as CSV.
 *
 * Features:
 * - Column selection (all checked by default)
 * - Optional Campaign Name column (resolved from campaign lookup)
 * - Editable filename pre-populated with [event-title]_[datetime]
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Button, ButtonGroup, Dialog, Content, Heading, Text, Checkbox, Divider, TextField } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import type { Campaign } from '../../types/campaign'
import { generateCsv, downloadCsv, CsvColumn, sanitizeFilename, exportDatetime } from '../../utils/csvExport'
import { formatRegisteredDateMmDdYyyy, getAttendeeName } from '../../types/attendee'

const CAMPAIGN_NAME_KEY = '__campaignName__'

interface ExportDialogProps {
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  campaigns: Campaign[]
  eventTitle: string
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  attendees,
  columnConfig,
  campaigns,
  eventTitle,
  onClose,
}) => {
  // Build campaign name lookup
  const campaignLookup = useMemo(() => {
    const map = new Map<string, string>()
    campaigns.forEach(c => map.set(c.campaignId, c.name))
    return map
  }, [campaigns])

  // Inject synthetic "Campaign Name" column after "campaignId" when campaigns exist
  const displayColumns = useMemo(() => {
    if (campaigns.length === 0) return columnConfig
    const extra = { key: CAMPAIGN_NAME_KEY, label: 'Campaign Name' }
    const idx = columnConfig.findIndex(c => c.key === 'campaignId')
    if (idx >= 0) {
      return [
        ...columnConfig.slice(0, idx + 1),
        extra,
        ...columnConfig.slice(idx + 1),
      ]
    }
    return [...columnConfig, extra]
  }, [columnConfig, campaigns])

  // All columns checked by default
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(displayColumns.map(c => c.key))
  )

  const [filename, setFilename] = useState(
    () => sanitizeFilename(eventTitle || 'event') + '_' + exportDatetime()
  )

  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedColumns(new Set(displayColumns.map(c => c.key)))
    } else {
      setSelectedColumns(new Set())
    }
  }, [displayColumns])

  const allSelected = selectedColumns.size === displayColumns.length

  const handleExport = useCallback(() => {
    const columns: CsvColumn[] = displayColumns
      .filter(c => selectedColumns.has(c.key) && c.key !== CAMPAIGN_NAME_KEY)
      .map(c => ({ key: c.key, label: c.label }))

    const includeCampaignName = selectedColumns.has(CAMPAIGN_NAME_KEY)
    if (includeCampaignName) {
      columns.push({ key: 'campaignName', label: 'Campaign Name' })
    }

    const data = attendees.map(a => {
      const row: Record<string, unknown> = { ...a }
      for (const k of Object.keys(row)) {
        const v = row[k]
        if (typeof v === 'boolean') {
          row[k] = v ? 'Yes' : 'No'
        }
      }
      row.name = getAttendeeName(a)
      row.creationTime = formatRegisteredDateMmDdYyyy(a.creationTime) || ''
      if (includeCampaignName) {
        row.campaignName = campaignLookup.get(String(a.campaignId ?? '')) ?? ''
      }
      return row
    })

    const csv = generateCsv(data, columns)
    downloadCsv(csv, `${filename.trim() || 'export'}.csv`)
    onClose()
  }, [attendees, displayColumns, selectedColumns, campaignLookup, filename, onClose])

  return (
    <Dialog>
      {() => (
        <>
          <Heading slot="title">Export Attendees to CSV</Heading>
          <Content>
            <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
              <Text>Select columns to include in the export:</Text>

              <Checkbox
                isSelected={allSelected}
                onChange={toggleAll}
                isIndeterminate={selectedColumns.size > 0 && !allSelected}
              >
                Select All
              </Checkbox>

              <Divider size="S" />

              <div className={style({display: 'flex', flexDirection: 'column', gap: 8})} style={{ maxHeight: 300, overflowY: 'auto' }}>
                {displayColumns.map(col => (
                  <Checkbox
                    key={col.key}
                    isSelected={selectedColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  >
                    {col.label}
                  </Checkbox>
                ))}
              </div>

              <Divider size="S" />

              <TextField
                label="File name"
                value={filename}
                onChange={setFilename}
                description=".csv will be appended automatically"
                styles={style({ width: '[100%]' })}
              />
            </div>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="accent"
              onPress={handleExport}
              isDisabled={selectedColumns.size === 0 || attendees.length === 0}
            >
              <Text>Export ({attendees.length} rows)</Text>
            </Button>
          </ButtonGroup>
        </>
      )}
    </Dialog>
  )
}

export default ExportDialog
