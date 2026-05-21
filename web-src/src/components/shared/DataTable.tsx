/*
* <license header>
*/

import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { ActionButton, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Sort from "@react-spectrum/s2/icons/Sort"
import SortUp from "@react-spectrum/s2/icons/SortUp"
import SortDown from "@react-spectrum/s2/icons/SortDown"
import Edit from '@react-spectrum/s2/icons/Edit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Visibility from '@react-spectrum/s2/icons/Visibility'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import { deduplicateBy } from '../../utils/deduplication'
import BuildTable from '@react-spectrum/s2/illustrations/linear/BuildTable'
import { ResourceEmptyState, RESOURCE_EMPTY_STATE_MIN_HEIGHT_PX } from './ResourceEmptyState'

export interface TableColumn<T> {
  key: string
  name: string
  width?: number
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  sortFn?: (a: T, b: T) => number
  isSticky?: boolean
  /** Keep cell on one line (e.g. actions); default is wrap-friendly for stable column widths */
  cellNoWrap?: boolean
}

export interface TableAction<T> {
  icon: 'view' | 'edit' | 'delete'
  label: string
  onAction: (item: T) => void
}

export interface DataTableTestIds {
  root?: string
  emptyState?: string
  pageInput?: string
  header?: (columnKey: string) => string
  row?: (itemKey: string) => string
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
  isRowExpandable?: (item: T) => boolean
  testIds?: DataTableTestIds
}

const iconMap = {
  view: Visibility,
  edit: Edit,
  delete: RemoveCircle
}

const EDGE_ZONE_PX = 56
const MAX_SCROLL_SPEED_PX_PER_S = 1400
const SCROLL_EPSILON = 2

function sumStickyRightHeaderWidths(scrollRoot: HTMLElement): number {
  const headers = scrollRoot.querySelectorAll<HTMLElement>('thead th[class*="sticky-right"]')
  let sum = 0
  headers.forEach((th) => {
    sum += th.offsetWidth
  })
  return sum
}

interface DataTableScrollRegionProps {
  children: React.ReactNode
  /** Bumps measurement when columns / structure change */
  layoutKey: string
}

/**
 * Proximity horizontal auto-scroll + edge gradients for mouse users.
 * Right-edge math excludes sticky-right header width so actions stay clickable.
 */
function DataTableScrollRegion({ children, layoutKey }: DataTableScrollRegionProps): React.ReactElement {
  const shellRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftHintRef = useRef<HTMLDivElement>(null)
  const rightHintRef = useRef<HTMLDivElement>(null)
  const velocityRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef(0)
  const reduceMotionRef = useRef(false)
  const [stickyReservedWidth, setStickyReservedWidth] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotionRef.current = mq.matches
    const onChange = () => {
      reduceMotionRef.current = mq.matches
      if (mq.matches) {
        velocityRef.current = 0
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const updateHintOpacity = useCallback(() => {
    const el = scrollRef.current
    const leftEl = leftHintRef.current
    const rightEl = rightHintRef.current
    if (!el || !leftEl || !rightEl) return

    const maxScroll = el.scrollWidth - el.clientWidth
    const hasOverflow = maxScroll > SCROLL_EPSILON
    const sl = el.scrollLeft

    const leftOp = hasOverflow && sl > SCROLL_EPSILON ? 1 : 0
    const rightOp = hasOverflow && sl < maxScroll - SCROLL_EPSILON ? 1 : 0
    leftEl.style.opacity = String(leftOp)
    rightEl.style.opacity = String(rightOp)
  }, [])

  const measureSticky = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    const raw = sumStickyRightHeaderWidths(root)
    const clamped = Math.min(Math.max(0, raw), root.clientWidth)
    setStickyReservedWidth(clamped)
  }, [])

  useLayoutEffect(() => {
    measureSticky()
    updateHintOpacity()
  }, [layoutKey, measureSticky, updateHintOpacity])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const ro = new ResizeObserver(() => {
      measureSticky()
      updateHintOpacity()
    })
    ro.observe(root)
    const table = root.querySelector('table')
    if (table) {
      ro.observe(table)
    }

    const onScroll = () => updateHintOpacity()
    root.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      ro.disconnect()
      root.removeEventListener('scroll', onScroll)
    }
  }, [layoutKey, measureSticky, updateHintOpacity])

  const runTick = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      rafRef.current = null
      return
    }

    const now = performance.now()
    if (lastTickRef.current === 0) {
      lastTickRef.current = now
    }
    const dt = Math.min(0.1, (now - lastTickRef.current) / 1000)
    lastTickRef.current = now

    const v = reduceMotionRef.current ? 0 : velocityRef.current
    if (v !== 0) {
      el.scrollLeft += v * dt
    }
    updateHintOpacity()

    if (velocityRef.current !== 0 && !reduceMotionRef.current) {
      rafRef.current = requestAnimationFrame(runTick)
    } else {
      rafRef.current = null
      lastTickRef.current = 0
    }
  }, [updateHintOpacity])

  const ensureTick = useCallback(() => {
    if (rafRef.current == null && velocityRef.current !== 0 && !reduceMotionRef.current) {
      rafRef.current = requestAnimationFrame(runTick)
    }
  }, [runTick])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const shell = shellRef.current
      if (!shell || !scrollRef.current || reduceMotionRef.current) {
        velocityRef.current = 0
        return
      }

      const rect = shell.getBoundingClientRect()
      const stickyW = stickyReservedWidth
      const effectiveRight = rect.right - stickyW

      const distLeft = e.clientX - rect.left
      const distRight = effectiveRight - e.clientX

      let vLeft = 0
      let vRight = 0
      if (distLeft >= 0 && distLeft < EDGE_ZONE_PX) {
        vLeft = -MAX_SCROLL_SPEED_PX_PER_S * (1 - distLeft / EDGE_ZONE_PX)
      }
      if (distRight >= 0 && distRight < EDGE_ZONE_PX && e.clientX < effectiveRight) {
        vRight = MAX_SCROLL_SPEED_PX_PER_S * (1 - distRight / EDGE_ZONE_PX)
      }

      if (vLeft !== 0 && vRight !== 0) {
        velocityRef.current = Math.abs(vLeft) >= Math.abs(vRight) ? vLeft : vRight
      } else {
        velocityRef.current = vLeft + vRight
      }

      if (velocityRef.current !== 0) {
        ensureTick()
      }
    },
    [ensureTick, stickyReservedWidth]
  )

  const handleMouseLeave = useCallback(() => {
    velocityRef.current = 0
    updateHintOpacity()
  }, [updateHintOpacity])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className="data-table-scroll-shell"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={scrollRef}
        className="custom-data-table"
        style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}
      >
        {children}
      </div>
      <div ref={leftHintRef} className="data-table-scroll-hint-left" aria-hidden />
      <div
        ref={rightHintRef}
        className="data-table-scroll-hint-right"
        style={{ right: stickyReservedWidth, width: EDGE_ZONE_PX }}
        aria-hidden
      />
    </div>
  )
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
  onToggleExpand,
  isRowExpandable,
  testIds
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

  // Reset to page 1 when result count or page size changes (keeps currentPage valid)
  React.useEffect(() => {
    setCurrentPage(1)
    setPageInputValue('1')
  }, [data.length, pageSize])

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
      cols.push({ key: 'actions', name: 'Actions', sortable: false, cellNoWrap: true })
    }
    return cols
  }, [columns, actions])

  const totalColumnCount = allColumns.length + (isExpandable ? 1 : 0)

  const scrollLayoutKey = useMemo(
    () =>
      `${allColumns.map((c) => `${c.key}:${c.width ?? ''}:${c.isSticky ? 1 : 0}`).join('|')}|e:${isExpandable ? 1 : 0}|a:${actions?.length ?? 0}`,
    [allColumns, isExpandable, actions?.length]
  )

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
      <div
        data-testid={testIds?.emptyState}
        className={style({
          display: 'flex',
          flexDirection: 'column',
          width: '[100%]',
          flex: 1,
        })}
        style={{ minHeight: RESOURCE_EMPTY_STATE_MIN_HEIGHT_PX }}
      >
        {emptyState ?? (
          <ResourceEmptyState
            fillContainer
            illustration={<BuildTable aria-hidden />}
            title="No data to show"
            description="There is nothing in this list yet. Add or import items elsewhere in the app to see them here."
          />
        )}
      </div>
    )
  }

  return (
    <div
      data-testid={testIds?.root ?? 'data-table'}
      className={style({ display: 'flex', flexDirection: 'column', gap: 12, height: '[100%]', width: '[100%]' })}
    >
      <DataTableScrollRegion layoutKey={scrollLayoutKey}>
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
                    data-testid={testIds?.header?.(column.key)}
                    onClick={() => isSortable && handleSort(column.key)}
                    className={className}
                    style={{
                      textAlign: column.key === 'actions' ? 'right' : 'left',
                      minWidth: `${minWidth}px`,
                      width: column.width ? `${column.width}px` : 'auto'
                    }}
                  >
                    <div
                      className="data-table-header-inner"
                      style={{ justifyContent: column.key === 'actions' ? 'flex-end' : 'flex-start' }}
                    >
                      <div className="data-table-header-label">
                        <Text UNSAFE_style={{
                          fontWeight: 600,
                          fontSize: '12px',
                          color: isSorted ? 'var(--spectrum-global-color-gray-900)' : 'var(--spectrum-global-color-gray-600)'
                        }}>
                          {column.name}
                        </Text>
                      </div>
                      {isSortable && (
                        <span
                          className="data-table-header-sort"
                          style={{ opacity: isSorted ? 1 : 0.3 }}
                        >
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
              const rowExpandable = isExpandable && (!isRowExpandable || isRowExpandable(item))
              const isExpanded = rowExpandable && effectiveExpandedKeys.has(itemKey)
              return (
                <React.Fragment key={itemKey}>
                  <tr data-testid={testIds?.row?.(itemKey)} className={isExpanded ? 'expanded-parent' : ''}>
                    {isExpandable && (
                      <td className="data-table-td-nowrap" style={{ width: '40px', minWidth: '40px', padding: '0 8px', verticalAlign: 'middle' }}>
                        {rowExpandable && (
                          <ActionButton
                            isQuiet
                            onPress={() => handleToggleExpand(itemKey)}
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            UNSAFE_style={{ padding: 0 }}
                          >
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                          </ActionButton>
                        )}
                      </td>
                    )}
                    {allColumns.map((column) => {
                      const minWidth = Math.max(column.width || 100, 100)
                      const stickyClass = column.isSticky ? getStickyClass(column.key) : ''
                      const nowrapClass = column.cellNoWrap ? 'data-table-td-nowrap' : ''
                      const cellClass = [stickyClass, nowrapClass].filter(Boolean).join(' ')
                      return (
                      <td
                        key={column.key}
                        className={cellClass || undefined}
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
      </DataTableScrollRegion>

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
              data-testid={testIds?.pageInput}
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
