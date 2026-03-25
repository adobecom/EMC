/*
* <license header>
*/

import React, { useState, useMemo, useCallback } from 'react'
import { ActionButton, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Sort from "@react-spectrum/s2/icons/Sort"
import SortUp from "@react-spectrum/s2/icons/SortUp"
import SortDown from "@react-spectrum/s2/icons/SortDown"
import Edit from '@react-spectrum/s2/icons/Edit'
import Delete from '@react-spectrum/s2/icons/Delete'
import Visibility from '@react-spectrum/s2/icons/Visibility'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import { deduplicateBy } from '../../utils/deduplication'

export interface TableColumn<T> {
  key: string
  name: string
  width?: number
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
  isSticky?: boolean
}

export interface TableAction<T> {
  icon: 'view' | 'edit' | 'delete'
  label: string
  onAction: (item: T) => void
}

interface DataTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  actions?: TableAction<T>[]
  emptyState?: React.ReactNode
  isLoading?: boolean
  getItemKey: (item: T) => string
  pageSize?: number
  onVisibleItemsChange?: (items: T[]) => void
  renderExpandedContent?: (item: T) => React.ReactNode
  expandedKeys?: Set<string>
  onToggleExpand?: (key: string) => void
}

const iconMap = {
  view: Visibility,
  edit: Edit,
  delete: Delete
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  actions,
  emptyState,
  isLoading = false,
  getItemKey,
  pageSize = 20,
  onVisibleItemsChange,
  renderExpandedContent,
  expandedKeys,
  onToggleExpand
}: DataTableProps<T>): React.ReactElement {
  const isExpandable = !!renderExpandedContent

  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string>>(new Set())
  const effectiveExpandedKeys = expandedKeys ?? internalExpandedKeys

  const handleToggleExpand = useCallback((key: string) => {
    if (onToggleExpand) {
      onToggleExpand(key)
    } else {
      setInternalExpandedKeys(prev => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      })
    }
  }, [onToggleExpand])
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInputValue, setPageInputValue] = useState('1')

  // Deduplicate data as safety net (last line of defense)
  const deduplicatedData = useMemo(() => {
    return deduplicateBy(data, getItemKey, {
      warnOnDuplicates: true,
      logPrefix: 'DataTable'
    })
  }, [data, getItemKey])

  // Handle column header click for sorting
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    // Use functional setState to avoid stale closures
    setSortColumn(prevColumn => {
      if (prevColumn === columnKey) {
        // Same column - toggle direction
        setSortDirection(prevDirection => {
          return prevDirection === 'asc' ? 'desc' : 'asc'
        })
        return prevColumn
      } else {
        // Different column - default to descending on first click
        setSortDirection('desc')
        return columnKey
      }
    })
  }, [columns])

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    if (!sortColumn) return deduplicatedData

    const column = columns.find(col => col.key === sortColumn)
    if (!column) return deduplicatedData

    const sorted = [...deduplicatedData].sort((a, b) => {
      // Use custom sort function if provided
      if (column.sortFn) {
        return column.sortFn(a, b)
      }

      // Default sort by column key
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal
      }

      // Fallback to string comparison
      return String(aVal).localeCompare(String(bVal))
    })

    return sortDirection === 'desc' ? sorted.reverse() : sorted
  }, [deduplicatedData, sortColumn, sortDirection, columns])

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize])

  // Notify parent of visible items change
  React.useEffect(() => {
    if (onVisibleItemsChange && paginatedData.length > 0) {
      onVisibleItemsChange(paginatedData)
    }
  }, [paginatedData, onVisibleItemsChange])

  // Reset to page 1 when data changes
  React.useEffect(() => {
    setCurrentPage(1)
    setPageInputValue('1')
  }, [data.length])

  // Pagination handlers
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      setPageInputValue(String(newPage))
    }
  }, [currentPage])

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      setPageInputValue(String(newPage))
    }
  }, [currentPage, totalPages])

  const handlePageInputChange = useCallback((value: string) => {
    setPageInputValue(value)
  }, [])

  const handlePageInputBlur = useCallback(() => {
    const pageNum = parseInt(pageInputValue, 10)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    } else {
      // Reset to current page if invalid
      setPageInputValue(String(currentPage))
    }
  }, [pageInputValue, totalPages, currentPage])

  const handlePageInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputBlur()
    }
  }, [handlePageInputBlur])

  // Must define all hooks before any conditional returns (Rules of Hooks)
  const allColumns = React.useMemo(() => {
    const cols = [...columns]
    if (actions && actions.length > 0) {
      cols.push({ key: 'actions', name: 'Actions', sortable: false })
    }
    return cols
  }, [columns, actions])

  const totalColumnCount = allColumns.length + (isExpandable ? 1 : 0)

  // Get sticky column classes
  const getStickyClass = (columnKey: string): string => {
    const stickyColumns = allColumns.filter(c => c.isSticky).reverse()
    const index = stickyColumns.findIndex(c => c.key === columnKey)
    if (index === -1) return ''
    return `sticky-right-${index + 1}`
  }

  const renderCell = (item: T, column: TableColumn<T>) => {
    if (column.render) {
      return column.render(item)
    }

    const value = item[column.key]
    return <Text>{value != null ? String(value) : '-'}</Text>
  }

  // Empty state check AFTER all hooks are defined
  if (data.length === 0 && !isLoading) {
    return (
      <div style={{ width: '100%', minHeight: '400px' }}>
        {emptyState || <Text>No data available</Text>}
      </div>
    )
  }

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, height: '[100%]', width: '[100%]' })}>
      <div className="custom-data-table" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
        <table>
          <thead>
            <tr>
              {isExpandable && (
                <th style={{ width: '40px', minWidth: '40px', padding: '0 8px' }} />
              )}
              {allColumns.map((column) => {
                const isSortable = column.sortable !== false && column.key !== 'actions'
                const isSorted = sortColumn === column.key
                const minWidth = Math.max(column.width || 100, 100)
                const stickyClass = column.isSticky ? getStickyClass(column.key) : ''
                const className = [
                  isSortable ? 'sortable' : '',
                  stickyClass
                ].filter(Boolean).join(' ')

                return (
                  <th
                    key={column.key}
                    onClick={() => isSortable && handleSort(column.key)}
                    className={className}
                    style={{
                      textAlign: column.key === 'actions' ? 'right' : 'left',
                      minWidth: `${minWidth}px`,
                      width: column.width ? `${column.width}px` : 'auto'
                    }}
                  >
                    <div
                      className={style({ display: 'flex', alignItems: 'center', gap: 8 })}
                      style={{ justifyContent: column.key === 'actions' ? 'flex-end' : 'flex-start' }}
                    >
                      <Text UNSAFE_style={{
                        fontWeight: 600,
                        fontSize: '12px',
                        color: isSorted ? 'var(--spectrum-global-color-gray-900)' : 'var(--spectrum-global-color-gray-600)'
                      }}>
                        {column.name}
                      </Text>
                      {isSortable && (
                        <span style={{
                          opacity: isSorted ? 1 : 0.3,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {isSorted
                            ? (sortDirection === 'asc' ? <SortUp /> : <SortDown />)
                            : <Sort />}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => {
              const itemKey = getItemKey(item)
              const isExpanded = isExpandable && effectiveExpandedKeys.has(itemKey)
              return (
                <React.Fragment key={itemKey}>
                  <tr className={isExpanded ? 'expanded-parent' : ''}>
                    {isExpandable && (
                      <td style={{ width: '40px', minWidth: '40px', padding: '0 8px', verticalAlign: 'middle' }}>
                        <ActionButton
                          isQuiet
                          onPress={() => handleToggleExpand(itemKey)}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          UNSAFE_style={{ padding: 0 }}
                        >
                          {isExpanded ? <ChevronDown /> : <ChevronRight />}
                        </ActionButton>
                      </td>
                    )}
                    {allColumns.map((column) => {
                      const minWidth = Math.max(column.width || 100, 100)
                      const stickyClass = column.isSticky ? getStickyClass(column.key) : ''
                      return (
                      <td
                        key={column.key}
                        className={stickyClass}
                        style={{
                          textAlign: column.key === 'actions' ? 'right' : 'left',
                          minWidth: `${minWidth}px`,
                          width: column.width ? `${column.width}px` : 'auto'
                        }}
                      >
                        {column.key === 'actions' && actions ? (
                          <div className={style({ display: 'flex', gap: 8 })} style={{ justifyContent: 'flex-end' }}>
                            {actions.map((action, idx) => {
                              const Icon = iconMap[action.icon]
                              return (
                                <ActionButton
                                  key={idx}
                                  isQuiet
                                  onPress={() => action.onAction(item)}
                                  aria-label={action.label}
                                >
                                  <Icon />
                                </ActionButton>
                              )
                            })}
                          </div>
                        ) : (
                          renderCell(item, column)
                        )}
                      </td>
                      )
                    })}
                  </tr>
                  {isExpanded && renderExpandedContent && (
                    <tr className="expanded-content-row">
                      <td colSpan={totalColumnCount} style={{ padding: 0 }}>
                        <div className="expanded-content-panel">
                          {renderExpandedContent(item)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={style({ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' })}
          style={{ padding: '8px 0' }}
        >
          <ActionButton
            onPress={handlePrevPage}
            isDisabled={currentPage === 1}
            isQuiet
            aria-label="Previous page"
          >
            <ChevronLeft />
          </ActionButton>

          <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <input
              type="text"
              value={pageInputValue}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyDown}
              style={{
                width: '50px',
                padding: '4px 8px',
                textAlign: 'center',
                border: '1px solid var(--spectrum-global-color-gray-400)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              aria-label="Current page"
            />
            <Text>of {totalPages} pages</Text>
          </div>

          <ActionButton
            onPress={handleNextPage}
            isDisabled={currentPage === totalPages}
            isQuiet
            aria-label="Next page"
          >
            <ChevronRight />
          </ActionButton>
        </div>
      )}
    </div>
  )
}
