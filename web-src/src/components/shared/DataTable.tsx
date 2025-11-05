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
import ChevronUp from '@spectrum-icons/workflow/ChevronUp'
import ChevronDown from '@spectrum-icons/workflow/ChevronDown'

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
  getItemKey
}: DataTableProps<T>): React.ReactElement {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  React.useEffect(() => {
    console.log('🔄 DataTable MOUNTED')
    return () => console.log('❌ DataTable UNMOUNTED')
  }, [])
  
  React.useEffect(() => {
    console.log('📊 State changed:', { sortColumn, sortDirection })
  }, [sortColumn, sortDirection])

  // Handle column header click for sorting
  const handleSort = useCallback((columnKey: string) => {
    console.log('🔍 handleSort called for column:', columnKey)
    
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    // Use functional setState to avoid stale closures
    setSortColumn(prevColumn => {
      if (prevColumn === columnKey) {
        // Same column - toggle direction
        setSortDirection(prevDirection => {
          const newDir = prevDirection === 'asc' ? 'desc' : 'asc'
          console.log('🔄 Same column, toggling direction to:', newDir)
          return newDir
        })
        return prevColumn
      } else {
        // Different column - set to ascending
        console.log('✨ New column, setting to asc')
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

  const renderColumnHeader = (column: TableColumn<T>) => {
    const isSortable = column.sortable !== false && column.key !== 'actions'
    const isSorted = sortColumn === column.key

    return (
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
    )
  }

  return (
    <TableView
      aria-label="Data table"
      selectionMode={selectionMode}
      onSelectionChange={onSelectionChange}
      width="100%"
      height="100%"
      overflowMode="wrap"
    >
      <TableHeader columns={allColumns}>
        {(column) => (
          <Column 
            key={column.key} 
            width={column.width} 
            align={column.key === 'actions' ? 'end' : 'start'}
          >
            <div 
              onClick={() => handleSort(column.key as string)}
              style={{ cursor: (column.sortable !== false && column.key !== 'actions') ? 'pointer' : 'default' }}
            >
              {renderColumnHeader(column)}
            </div>
          </Column>
        )}
      </TableHeader>
      <TableBody items={sortedData}>
        {(item) => (
          <Row key={getItemKey(item)}>
            {(columnKey) => <Cell>{renderCell(item, columnKey)}</Cell>}
          </Row>
        )}
      </TableBody>
    </TableView>
  )
}

