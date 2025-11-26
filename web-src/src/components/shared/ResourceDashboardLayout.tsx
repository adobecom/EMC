/* 
* <license header>
*/

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Flex,
  Heading,
  View,
  Text,
  ActionButton,
  Button,
  SearchField
} from '@adobe/react-spectrum'
import Refresh from '@spectrum-icons/workflow/Refresh'
import { DataTable, TableColumn, TableAction } from './DataTable'
import { LoadingSpinner } from './LoadingSpinner'

interface ResourceDashboardLayoutProps<T> {
  // Header props
  title: string
  description?: string // deprecated - no longer displayed
  totalCount: number
  
  // State
  isLoading: boolean
  error: string | null
  data: T[]
  
  // Table configuration
  columns: TableColumn<T>[]
  getItemKey: (item: T) => string
  actions?: TableAction<T>[]
  pageSize?: number
  
  // Action handlers
  onRefresh: () => void
  onCreate?: () => void
  createLabel?: string
  onVisibleItemsChange?: (items: T[]) => void
  
  // Empty state
  emptyStateTitle?: string
  emptyStateDescription?: string
  
  // Loading message
  loadingMessage?: string
  
  // Search configuration
  searchPlaceholder?: string
  searchKeys?: (keyof T)[] | string[]
}

export function ResourceDashboardLayout<T extends Record<string, any>>({
  title,
  totalCount,
  isLoading,
  error,
  data,
  columns,
  getItemKey,
  actions,
  pageSize = 10,
  onRefresh,
  onCreate,
  createLabel = 'Create',
  onVisibleItemsChange,
  emptyStateTitle = 'No Items Found',
  emptyStateDescription = 'Get started by creating your first item',
  loadingMessage = 'Loading...',
  searchPlaceholder = 'Search...',
  searchKeys = []
}: ResourceDashboardLayoutProps<T>): React.ReactElement {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Clear handler
  const handleClear = useCallback(() => {
    setInputValue('')
    setDebouncedQuery('')
  }, [])

  // Filter data based on debounced search query
  const filteredData = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return data
    }

    const query = debouncedQuery.toLowerCase()
    
    return data.filter(item => {
      // If searchKeys are provided, search only those fields
      if (searchKeys.length > 0) {
        return searchKeys.some(key => {
          const value = item[key as keyof T]
          if (value == null) return false
          return String(value).toLowerCase().includes(query)
        })
      }
      
      // Otherwise, search all string/number fields
      return Object.values(item).some(value => {
        if (value == null) return false
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value).toLowerCase().includes(query)
        }
        return false
      })
    })
  }, [data, debouncedQuery, searchKeys])
  
  if (error) {
    return (
      <View height="100%">
        <Flex direction="column" gap="size-150" alignItems="center" justifyContent="center" height="100%">
          <Heading level={3}>Error Loading Data</Heading>
          <Text>{error}</Text>
          <ActionButton onPress={onRefresh}>
            <Refresh />
            <Text>Retry</Text>
          </ActionButton>
        </Flex>
      </View>
    )
  }

  const displayCount = debouncedQuery ? filteredData.length : totalCount
  const isSearching = inputValue !== debouncedQuery

  return (
    <View padding="size-400">
      <Flex direction="column" gap="size-150" height="100%">
        {/* Header */}
        <Flex direction="row" justifyContent="space-between" alignItems="center">
          <Flex direction="row" gap="size-100" alignItems="baseline">
            <Heading level={2} marginBottom="size-0">{title}</Heading>
            {debouncedQuery ? (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                (Showing {displayCount} of {totalCount})
              </Text>
            ) : (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                ({totalCount} {totalCount === 1 ? 'item' : 'items'})
              </Text>
            )}
          </Flex>
          <Flex direction="row" gap="size-150" alignItems="center">
            <SearchField
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={setInputValue}
              onClear={handleClear}
              width="size-3000"
              aria-label="Search"
            />
            <Flex direction="row" gap="size-150">
              <ActionButton onPress={onRefresh} isQuiet>
                <Refresh />
              </ActionButton>
              {onCreate && (
                <Button onPress={onCreate} variant="accent">
                  {createLabel}
                </Button>
              )}
            </Flex>
          </Flex>
        </Flex>

        {/* Table */}
        <View flex="1" borderRadius="medium">
          {isLoading || isSearching ? (
            <Flex 
              justifyContent="center" 
              alignItems="center" 
              height="100%"
              UNSAFE_className="fade-in"
            >
              <LoadingSpinner message={isSearching ? 'Searching...' : loadingMessage} />
            </Flex>
          ) : (
            <div className="fade-in">
              <DataTable
                columns={columns}
                data={filteredData}
                getItemKey={getItemKey}
                actions={actions}
                pageSize={pageSize}
                onVisibleItemsChange={onVisibleItemsChange}
              emptyState={
                <Flex direction="column" gap="size-150" alignItems="center">
                  <Heading level={3}>
                    {debouncedQuery ? 'No Results Found' : emptyStateTitle}
                  </Heading>
                  <Text>
                    {debouncedQuery 
                      ? `No items match "${debouncedQuery}"`
                      : emptyStateDescription
                    }
                  </Text>
                  {debouncedQuery ? (
                    <ActionButton onPress={handleClear}>
                      Clear Search
                    </ActionButton>
                  ) : (
                    onCreate && (
                      <Button onPress={onCreate} variant="accent">
                        {createLabel}
                      </Button>
                    )
                  )}
                </Flex>
              }
              />
            </div>
          )}
        </View>
      </Flex>
    </View>
  )
}

