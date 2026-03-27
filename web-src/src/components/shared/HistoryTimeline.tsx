/*
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import {
  ProgressCircle,
  ActionButton,
  TooltipTrigger,
  Tooltip,
  Text,
  Button
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Clock from '@react-spectrum/s2/icons/Clock'
import Close from '@react-spectrum/s2/icons/Close'
import Add from '@react-spectrum/s2/icons/Add'
import Edit from '@react-spectrum/s2/icons/Edit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import {
  COLORS,
  Z_INDEX,
  TYPOGRAPHY,
  SPACING
} from '../../styles/designSystem'
import { HistoryRecord, HistoryUser, EventHistoryResponse } from '../../types/domain'
import { apiService } from '../../services/api'
import { TimelinePoint } from './HistoryTimelinePoint'
import { DetailCard } from './HistoryDetailCard'

// ============================================================================
// TYPES
// ============================================================================

/** Supported resource types for history timeline */
export type HistoryResourceType = 'event' | 'series'

interface HistoryTimelineProps {
  /** The resource ID to fetch history for */
  resourceId: string
  /** The type of resource (defaults to 'event') */
  resourceType?: HistoryResourceType
  /** Whether the panel is initially open */
  isOpen?: boolean
  /** Callback when panel open state changes */
  onOpenChange?: (isOpen: boolean) => void
}

// ============================================================================
// UTILITY FUNCTIONS (used by sub-components)
// ============================================================================

/**
 * Format timestamp to readable date string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get a human-readable description of the change
 */
export function getChangeDescription(record: HistoryRecord): string {
  const { changeType, resourceSubtype, diff } = record

  // Base change type description
  let description = ''
  switch (changeType) {
    case 'create':
      description = 'Created'
      break
    case 'update':
      description = 'Updated'
      break
    case 'delete':
      description = 'Deleted'
      break
    default:
      description = changeType.charAt(0).toUpperCase() + changeType.slice(1)
  }

  // Add resource subtype if present
  if (resourceSubtype) {
    const subtypeLabel = resourceSubtype.charAt(0).toUpperCase() + resourceSubtype.slice(1)
    description += ` ${subtypeLabel}`
  } else {
    description += ' Event'
  }

  // Add specific field changes if available
  if (diff) {
    const changedFields: string[] = []

    if (diff.updated) {
      const keys = Object.keys(diff.updated)
      // Handle common field names
      if (keys.includes('published')) {
        if (diff.updated.published === true) {
          return 'Published Event'
        } else if (diff.updated.published === false) {
          return 'Unpublished Event'
        }
      }
      // Add up to 3 changed field names
      const relevantKeys = keys.filter(k => !['modificationTime', 'creationTime'].includes(k))
      changedFields.push(...relevantKeys.slice(0, 3))
    }

    if (changedFields.length > 0) {
      const formattedFields = changedFields.map(f =>
        f.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
      ).join(', ')
      description += ` (${formattedFields})`
    }
  }

  return description
}

/**
 * Get icon for change type
 */
export function getChangeIcon(changeType: string): React.ReactNode {
  switch (changeType) {
    case 'create':
      return <Add />
    case 'update':
      return <Edit />
    case 'delete':
      return <RemoveCircle />
    default:
      return <Edit />
  }
}

/**
 * Get color for change type
 */
export function getChangeColor(changeType: string): string {
  switch (changeType) {
    case 'create':
      return 'var(--spectrum-global-color-green-600)'
    case 'update':
      return 'var(--spectrum-global-color-blue-500)'
    case 'delete':
      return 'var(--spectrum-global-color-red-600)'
    default:
      return COLORS.GRAY_600
  }
}

/**
 * Format user name for display
 */
export function formatUserName(user: HistoryUser): string {
  if (user.name && user.name !== user.id) {
    return user.name
  }
  if (user.email) {
    // Extract name from email (before @)
    const emailName = user.email.split('@')[0]
    // Convert to title case
    return emailName.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return user.type === 'service' ? 'System' : 'Unknown User'
}

/**
 * Format a value for display in the diff
 */
export function formatDiffValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.length} items]`
    }
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...'
  }
  return String(value)
}

/**
 * Format a field name for display
 */
export function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  resourceId,
  resourceType = 'event',
  isOpen: controlledIsOpen,
  onOpenChange
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [lockedIndex, setLockedIndex] = useState<number | null>(null)

  // Derive labels based on resource type
  const resourceLabel = resourceType === 'series' ? 'Series' : 'Event'

  // Use controlled or uncontrolled state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (value: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(value)
    }
    onOpenChange?.(value)
  }

  // Fetch history when panel opens
  const fetchHistory = useCallback(async () => {
    if (!resourceId) return

    setIsLoading(true)
    setError(null)

    try {
      // Call appropriate API based on resource type
      const response = resourceType === 'series'
        ? await apiService.getSeriesHistory(resourceId)
        : await apiService.getEventHistory(resourceId)

      if ('error' in response) {
        setError('Failed to load history')
        return
      }

      const historyResponse = response as EventHistoryResponse
      // Sort by timestamp ascending (oldest to newest, left to right)
      const sortedRecords = [...(historyResponse.history || [])].sort(
        (a, b) => a.timestamp - b.timestamp
      )
      setHistoryRecords(sortedRecords)
    } catch (err) {
      console.error(`Error fetching ${resourceType} history:`, err)
      setError('Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [resourceId, resourceType])

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchHistory()
    }
  }, [isOpen, resourceId, fetchHistory])

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const togglePanel = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHoveredIndex(null)
      setLockedIndex(null)
    }
  }

  const handleCloseOverlay = () => {
    setIsOpen(false)
  }

  const handleHover = (index: number | null) => {
    setHoveredIndex(index)
  }

  const handleClick = (index: number) => {
    // If clicking the already locked index, unlock it
    if (lockedIndex === index) {
      setLockedIndex(null)
    } else {
      // Lock to this index
      setLockedIndex(index)
    }
  }

  // Show locked record if locked, otherwise show hovered record
  const activeIndex = lockedIndex !== null ? lockedIndex : hoveredIndex
  const activeRecord = activeIndex !== null ? historyRecords[activeIndex] : null
  const isLocked = lockedIndex !== null

  return (
    <>
      {/* Trigger Button */}
      <TooltipTrigger delay={0}>
        <ActionButton
          isQuiet
          onPress={togglePanel}
          aria-label="View event history"
          aria-expanded={isOpen}
          UNSAFE_style={{
            backgroundColor: isOpen ? COLORS.GRAY_200 : 'transparent'
          }}
        >
          <Clock />
          <Text UNSAFE_style={{ marginInlineStart: '6px' }}>History</Text>
        </ActionButton>
        <Tooltip>View event change history</Tooltip>
      </TooltipTrigger>

      {/* Frosted Overlay */}
      {isOpen && (
        <div
          onClick={handleCloseOverlay}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: Z_INDEX.MODAL_BACKDROP,
            cursor: 'pointer'
          }}
        />
      )}

      {/* Full-width Panel from Top */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.WHITE,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: Z_INDEX.MODAL,
          transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          maxHeight: '50vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div
          className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}
          style={{
            padding: `${SPACING.MD}px ${SPACING.LG}px`,
            borderBottom: `1px solid ${COLORS.GRAY_200}`,
            backgroundColor: COLORS.GRAY_100,
            flexShrink: 0
          }}
        >
          <div className={style({ display: 'flex', gap: 12, alignItems: 'center' })}>
            <Clock />
            <Text UNSAFE_style={TYPOGRAPHY.SUBSECTION_HEADING}>
              {resourceLabel} History
            </Text>
            {historyRecords.length > 0 && (
              <div
                style={{
                  backgroundColor: COLORS.GRAY_300,
                  padding: '2px 10px',
                  borderRadius: '12px',
                  marginLeft: '8px'
                }}
              >
                <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500 }}>
                  {historyRecords.length} change{historyRecords.length !== 1 ? 's' : ''}
                </Text>
              </div>
            )}
          </div>
          <ActionButton isQuiet onPress={() => setIsOpen(false)} aria-label="Close history panel">
            <Close />
          </ActionButton>
        </div>

        {/* Panel Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: `${SPACING.MD}px 0`
          }}
        >
          {isLoading ? (
            <div className={style({ display: 'flex', justifyContent: 'center', alignItems: 'center' })} style={{ height: 'var(--spectrum-global-dimension-size-2000)' }}>
              <ProgressCircle aria-label="Loading history" isIndeterminate size="L" />
            </div>
          ) : error ? (
            <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 })} style={{ padding: `${SPACING.XL}px` }}>
              <Text UNSAFE_style={{ color: COLORS.RED_600 }}>{error}</Text>
              <Button variant="secondary" onPress={fetchHistory}>
                Retry
              </Button>
            </div>
          ) : historyRecords.length === 0 ? (
            <div className={style({ display: 'flex', justifyContent: 'center', alignItems: 'center' })} style={{ height: 'var(--spectrum-global-dimension-size-2000)' }}>
              <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '14px' }}>
                No history records found for this {resourceType}
              </Text>
            </div>
          ) : (
            <div>
              {/* Timeline Container */}
              <div
                style={{
                  overflowX: 'auto',
                  padding: `0 ${SPACING.LG}px`,
                  marginBottom: `${SPACING.MD}px`
                }}
              >
                {/* Timeline with points */}
                <div
                  className={style({ display: 'flex', alignItems: 'start' })}
                  style={{
                    justifyContent: historyRecords.length <= 8 ? 'center' : 'flex-start',
                    position: 'relative',
                    minWidth: historyRecords.length > 8 ? `${historyRecords.length * 110}px` : 'auto',
                    padding: `${SPACING.SM}px 0`
                  }}
                >
                  {historyRecords.map((record, index) => (
                    <TimelinePoint
                      key={`${record.timestamp}-${index}`}
                      record={record}
                      index={index}
                      isHovered={hoveredIndex === index}
                      isLocked={lockedIndex === index}
                      onHover={handleHover}
                      onClick={handleClick}
                    />
                  ))}
                </div>
              </div>

              {/* Detail Card - shows selected record details */}
              <div style={{ marginTop: `${SPACING.SM}px` }}>
                <DetailCard record={activeRecord} isLocked={isLocked} />
              </div>

              {/* Legend */}
              <div
                className={style({ display: 'flex', gap: 24, justifyContent: 'center' })}
                style={{
                  padding: `${SPACING.MD}px`,
                  borderTop: `1px solid ${COLORS.GRAY_200}`,
                  marginTop: `${SPACING.MD}px`
                }}
              >
                <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--spectrum-global-color-green-600)'
                    }}
                  />
                  <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>Created</Text>
                </div>
                <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--spectrum-global-color-blue-500)'
                    }}
                  />
                  <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>Updated</Text>
                </div>
                <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--spectrum-global-color-red-600)'
                    }}
                  />
                  <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_600 }}>Deleted</Text>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
