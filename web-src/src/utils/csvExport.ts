/**
 * CSV export utilities for attendee data.
 */

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export interface CsvColumn {
  key: string
  label: string
}

export function generateCsv(data: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map(c => escapeCsvValue(c.label)).join(',')
  const rows = data.map(row =>
    columns.map(c => escapeCsvValue(row[c.key])).join(',')
  )
  // BOM for Excel compatibility
  return '\uFEFF' + [header, ...rows].join('\r\n')
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
