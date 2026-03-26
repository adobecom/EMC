/*
* <license header>
*/

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Text, Button, SearchField, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Refresh from "@react-spectrum/s2/icons/Refresh"
import NoSearchResults from '@react-spectrum/s2/illustrations/linear/NoSearchResults'
import BuildTable from '@react-spectrum/s2/illustrations/linear/BuildTable'
import { DataTable, TableColumn, TableAction } from './DataTable'
import { ResourceEmptyState } from './ResourceEmptyState'
import { LoadingSpinner } from './LoadingSpinner'
import { debounceCancellable } from '../../services/cacheUtils'
import { SPACING } from '../../styles/designSystem'

interface ResourceDashboardLayoutProps<T> {
  // Header props
  title: string
  description?: string // deprecated - no longer displayed
  totalCount: number

  // State
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
  createButton?: React.ReactNode // Custom create button (overrides onCreate/createLabel)
  onVisibleItemsChange?: (items: T[]) => void
  onVisibleIdsChange?: (ids: string[]) => void // Callback for visible item IDs

  // Empty state
  emptyStateTitle?: string
  emptyStateDescription?: string
  /** Linear illustration when the list is empty (not search). Defaults to BuildTable. */
  emptyStateIllustration?: React.ReactNode

  // Search configuration
  searchPlaceholder?: string
  searchKeys?: (keyof T)[] | string[]
  searchFilter?: (item: T, query: string) => boolean

  /** Shown after Refresh/Create, preceded by a vertical divider (e.g. filter trigger) */
  toolbarEnd?: React.ReactNode

  // Expandable row support
  renderExpandedContent?: (item: T) => React.ReactNode
  expandedKeys?: Set<string>
  onToggleExpand?: (key: string) => void
}

export function ResourceDashboardLayout<T extends Record<string, any>>({
  title,
  totalCount,
  error,
  data,
  columns,
  getItemKey,
  actions,
  pageSize = 10,
  onRefresh,
  onCreate,
  createLabel = 'Create',
  createButton,
  onVisibleItemsChange,
  onVisibleIdsChange,
  emptyStateTitle = 'No Items Found',
  emptyStateDescription = 'Get started by creating your first item',
  emptyStateIllustration,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  searchFilter,
  toolbarEnd,
  renderExpandedContent,
  expandedKeys,
  onToggleExpand,
}: ResourceDashboardLayoutProps<T>): React.ReactElement {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Use debounceCancellable utility from cacheUtils for proper cleanup
  // Create stable debounced function using useMemo
  const debouncedSetQuery = useMemo(
    () => debounceCancellable((value: string) => {
      setDebouncedQuery(value)
    }, 300), // 300ms delay as per throttling.md best practices for search
    [] // Empty deps - function is stable
  )

  // Update debounced query when input changes
  useEffect(() => {
    debouncedSetQuery.call(inputValue)
  }, [inputValue, debouncedSetQuery])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetQuery.cancel()
    }
  }, [debouncedSetQuery])

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
      if (searchFilter) {
        return searchFilter(item, query)
      }

      if (searchKeys.length > 0) {
        return searchKeys.some(key => {
          const value = item[key as keyof T]
          if (value == null) return false
          return String(value).toLowerCase().includes(query)
        })
      }

      return Object.values(item).some(value => {
        if (value == null) return false
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value).toLowerCase().includes(query)
        }
        return false
      })
    })
  }, [data, debouncedQuery, searchKeys, searchFilter])

  // Handle visible items change and extract IDs
  const handleVisibleItemsChange = useCallback((items: T[]) => {
    if (onVisibleItemsChange) {
      onVisibleItemsChange(items)
    }
    if (onVisibleIdsChange) {
      const ids = items.map(item => getItemKey(item))
      onVisibleIdsChange(ids)
    }
  }, [onVisibleItemsChange, onVisibleIdsChange, getItemKey])

  if (error) {
    return (
      <div style={{height: '100%'}}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', height: '[100%]' })}>
          <Heading level={3}>Error Loading Data</Heading>
          <Text>{error}</Text>
          <Button variant="secondary" fillStyle="outline" onPress={onRefresh}>
            <Refresh />
            <Text>Retry</Text>
          </Button>
        </div>
      </div>
    )
  }

  const displayCount = debouncedQuery ? filteredData.length : totalCount
  const isSearching = inputValue !== debouncedQuery

  return (
    <div className={style({padding: 32})}>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, height: '[100%]' })}>
        {/* Header */}
        <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <div className={style({ display: 'flex', gap: 8, alignItems: 'baseline' })}>
            <Heading level={2}>{title}</Heading>
            {debouncedQuery ? (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                (Showing {displayCount} of {totalCount})
              </Text>
            ) : (
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                ({totalCount} {totalCount === 1 ? 'item' : 'items'})
              </Text>
            )}
          </div>
          <div className={style({ display: 'flex', gap: 12, alignItems: 'center' })}>
            <SearchField
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={setInputValue}
              onClear={handleClear}
              styles={style({ width: 240 })}
              aria-label="Search"
            />
            <div className={style({ display: 'flex', gap: 12 })}>
              <Button variant="secondary" fillStyle="outline" onPress={onRefresh}>
                <Refresh />
                <Text>Refresh</Text>
              </Button>
              {createButton ? (
                createButton
              ) : onCreate && (
                <Button onPress={onCreate} variant="accent">
                  {createLabel}
                </Button>
              )}
              {toolbarEnd && (
                <>
                  <div
                    aria-hidden
                    className={style({ flexShrink: 0 })}
                    style={{
                      width: 1,
                      height: 28,
                      marginLeft: SPACING.XS,
                      marginRight: SPACING.XS,
                      backgroundColor: 'var(--spectrum-global-color-gray-300)',
                      alignSelf: 'center',
                    }}
                  />
                  <div className={style({ display: 'flex', alignItems: 'center' })}>{toolbarEnd}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table — min height so empty IllustratedMessage centers in the band */}
        <div className={style({ flex: 1, minHeight: '[480px]', display: 'flex', flexDirection: 'column' })}>
          {isSearching ? (
            <div
              className={`${style({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '[100%]' })} fade-in`}
            >
              <LoadingSpinner message="Searching..." />
            </div>
          ) : (
            <div className={`${style({ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '[100%]' })} fade-in`}>
              <DataTable
                columns={columns}
                data={filteredData}
                getItemKey={getItemKey}
                actions={actions}
                pageSize={pageSize}
                onVisibleItemsChange={handleVisibleItemsChange}
                renderExpandedContent={renderExpandedContent}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                emptyState={
                  debouncedQuery ? (
                    <ResourceEmptyState
                      fillContainer
                      illustration={<NoSearchResults aria-hidden />}
                      title="No Results Found"
                      description={`No items match "${debouncedQuery}"`}
                      actions={
                        <Button variant="secondary" fillStyle="outline" onPress={handleClear}>
                          <Text>Clear Search</Text>
                        </Button>
                      }
                    />
                  ) : (
                    <ResourceEmptyState
                      fillContainer
                      illustration={
                        emptyStateIllustration ?? <BuildTable aria-hidden />
                      }
                      title={emptyStateTitle}
                      description={emptyStateDescription}
                    />
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
