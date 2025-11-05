/* 
* <license header>
*/

import React, { useState, useMemo, useCallback } from 'react'
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Flex,
  ActionButton,
  Text
} from '@adobe/react-spectrum'
import type { Selection } from '@adobe/react-spectrum'
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import ViewDetail from '@spectrum-icons/workflow/ViewDetail'
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'

export interface TableColumn<T> {
  key: string
  name: string
  width?: number
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
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
  onSelectionChange?: (keys: Selection) => void
  selectionMode?: 'none' | 'single' | 'multiple'
  emptyState?: React.ReactNode
  isLoading?: boolean
  getItemKey: (item: T) => string
  pageSize?: number
}

const iconMap = {
  view: ViewDetail,
  edit: Edit,
  delete: Delete
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  actions,
  onSelectionChange,
  selectionMode = 'none',
  emptyState,
  isLoading = false,
  getItemKey,
  pageSize = 20
}: DataTableProps<T>): React.ReactElement {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInputValue, setPageInputValue] = useState('1')

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
        // Different column - set to ascending
        setSortDirection('asc')
        return columnKey
      }
    })
  }, [columns])

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    const column = columns.find(col => col.key === sortColumn)
    if (!column) return data

    const sorted = [...data].sort((a, b) => {
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
  }, [data, sortColumn, sortDirection, columns])

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  
  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize])

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

  const renderCell = (item: T, columnKey: React.Key) => {
    if (columnKey === 'actions' && actions) {
      return (
        <Flex gap="size-100" justifyContent="end">
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
        </Flex>
      )
    }

    const column = columns.find((col) => col.key === columnKey)
    if (!column) return null

    if (column.render) {
      return column.render(item)
    }

    const value = item[columnKey as string]
    return <Text>{value != null ? String(value) : '-'}</Text>
  }

  if (data.length === 0 && !isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="size-3000">
        {emptyState || <Text>No data available</Text>}
      </Flex>
    )
  }

  const allColumns = React.useMemo(() => {
    const cols = [...columns]
    if (actions && actions.length > 0) {
      cols.push({ key: 'actions', name: 'Actions', width: 100, sortable: false })
    }
    return cols
  }, [columns, actions])

  return (
    <Flex direction="column" gap="size-200" height="100%">
      <TableView
        key={`table-${sortColumn}-${sortDirection}`}
        aria-label="Data table"
        selectionMode={selectionMode}
        onSelectionChange={onSelectionChange}
        width="100%"
        flex="1"
        overflowMode="wrap"
        UNSAFE_style={{
          '--spectrum-table-header-row-height': '80px',
          '--spectrum-table-row-height': '156px'
        } as React.CSSProperties}
      >
        <TableHeader columns={allColumns}>
          {(column) => {
            const isSortable = column.sortable !== false && column.key !== 'actions'
            const isSorted = sortColumn === column.key
            
            return (
              <Column 
                key={column.key} 
                width={column.width} 
                align={column.key === 'actions' ? 'end' : 'start'}
              >
                <div 
                  onClick={() => handleSort(column.key as string)}
                  style={{ 
                    cursor: isSortable ? 'pointer' : 'default',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Flex 
                    direction="row" 
                    alignItems="center" 
                    gap="size-75"
                    UNSAFE_style={{ 
                      userSelect: 'none',
                      width: '100%'
                    }}
                  >
                    <Text UNSAFE_style={{ fontWeight: isSorted ? 600 : 400 }}>
                      {column.name}
                    </Text>
                    {isSortable && (
                      <span style={{ 
                        opacity: isSorted ? 1 : 0.3,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px'
                      }}>
                        {isSorted ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    )}
                  </Flex>
                </div>
              </Column>
            )
          }}
        </TableHeader>
        <TableBody items={paginatedData}>
          {(item) => (
            <Row key={getItemKey(item)}>
              {(columnKey) => (
                <Cell>
                  <div style={{ minHeight: '156px', minWidth: '132px', display: 'flex', alignItems: 'center' }}>
                    {renderCell(item, columnKey)}
                  </div>
                </Cell>
              )}
            </Row>
          )}
        </TableBody>
      </TableView>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Flex 
          direction="row" 
          gap="size-200" 
          alignItems="center" 
          justifyContent="center"
          UNSAFE_style={{ padding: '16px 0' }}
        >
          <ActionButton
            onPress={handlePrevPage}
            isDisabled={currentPage === 1}
            isQuiet
            aria-label="Previous page"
          >
            <ChevronLeft />
          </ActionButton>
          
          <Flex direction="row" gap="size-100" alignItems="center">
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
          </Flex>
          
          <ActionButton
            onPress={handleNextPage}
            isDisabled={currentPage === totalPages}
            isQuiet
            aria-label="Next page"
          >
            <ChevronRight />
          </ActionButton>
        </Flex>
      )}
    </Flex>
  )
}

