/**
 * ExportDialog — Lets admins export attendee data as CSV.
 *
 * Features:
 * - Column selection (all checked by default)
 * - Campaign name resolution (replaces campaignId with name)
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  Checkbox,
  Flex,
  Text,
  Divider,
} from '@adobe/react-spectrum'
import { Button, ButtonGroup, Dialog, Content, Heading } from '@react-spectrum/s2'
import type { Attendee, AttendeeColumnConfig } from '../../types/attendee'
import type { Campaign } from '../../types/campaign'
import { generateCsv, downloadCsv, CsvColumn } from '../../utils/csvExport'
import { getAttendeeName } from '../../types/attendee'

interface ExportDialogProps {
  attendees: Attendee[]
  columnConfig: AttendeeColumnConfig[]
  campaigns: Campaign[]
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  attendees,
  columnConfig,
  campaigns,
  onClose,
}) => {
  // All columns checked by default
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(columnConfig.map(c => c.key))
  )

  // Build campaign name lookup
  const campaignLookup = useMemo(() => {
    const map = new Map<string, string>()
    campaigns.forEach(c => map.set(c.campaignId, c.name))
    return map
  }, [campaigns])

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
      setSelectedColumns(new Set(columnConfig.map(c => c.key)))
    } else {
      setSelectedColumns(new Set())
    }
  }, [columnConfig])

  const allSelected = selectedColumns.size === columnConfig.length

  const handleExport = useCallback(() => {
    const columns: CsvColumn[] = columnConfig
      .filter(c => selectedColumns.has(c.key))
      .map(c => ({ key: c.key, label: c.label }))

    // Map data: name from firstName+lastName, campaignId → campaign name
    const data = attendees.map(a => {
      const row: Record<string, unknown> = { ...a }
      row.name = getAttendeeName(a)
      if (row.campaignId && campaignLookup.has(String(row.campaignId))) {
        row.campaignId = campaignLookup.get(String(row.campaignId))
      }
      return row
    })

    const csv = generateCsv(data, columns)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadCsv(csv, `attendees-export-${timestamp}.csv`)
    onClose()
  }, [attendees, columnConfig, selectedColumns, campaignLookup, onClose])

  return (
    <Dialog>
      {() => (
        <>
          <Heading slot="title">Export Attendees to CSV</Heading>
          <Content>
            <Flex direction="column" gap="size-200">
              <Text>Select columns to include in the export:</Text>

              <Checkbox
                isSelected={allSelected}
                onChange={toggleAll}
                isIndeterminate={selectedColumns.size > 0 && !allSelected}
              >
                Select All
              </Checkbox>

              <Divider size="S" />

              <Flex direction="column" gap="size-100" UNSAFE_style={{ maxHeight: 300, overflowY: 'auto' }}>
                {columnConfig.map(col => (
                  <Checkbox
                    key={col.key}
                    isSelected={selectedColumns.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  >
                    {col.label}
                  </Checkbox>
                ))}
              </Flex>
            </Flex>
          </Content>
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onPress={handleExport}
              isDisabled={selectedColumns.size === 0 || attendees.length === 0}
            >
              Export ({attendees.length} rows)
            </Button>
          </ButtonGroup>
        </>
      )}
    </Dialog>
  )
}

export default ExportDialog
