/* 
* <license header>
*/

import React from 'react'
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
import Edit from '@spectrum-icons/workflow/Edit'
import Delete from '@spectrum-icons/workflow/Delete'
import View from '@spectrum-icons/workflow/View'

export interface TableColumn<T> {
  key: string
  name: string
  width?: number | string
  render?: (item: T) => React.ReactNode
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
  onSelectionChange?: (keys: Set<React.Key>) => void
  selectionMode?: 'none' | 'single' | 'multiple'
  emptyState?: React.ReactNode
  isLoading?: boolean
  getItemKey: (item: T) => string
}

const iconMap = {
  view: View,
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

  return (
    <TableView
      aria-label="Data table"
      selectionMode={selectionMode}
      onSelectionChange={onSelectionChange}
      width="100%"
      height="100%"
      overflowMode="wrap"
    >
      <TableHeader>
        {columns.map((column) => (
          <Column key={column.key} width={column.width}>
            {column.name}
          </Column>
        ))}
        {actions && actions.length > 0 && (
          <Column key="actions" width={100} align="end">
            Actions
          </Column>
        )}
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <Row key={getItemKey(item)}>
            {(columnKey) => <Cell>{renderCell(item, columnKey)}</Cell>}
          </Row>
        ))}
      </TableBody>
    </TableView>
  )
}

