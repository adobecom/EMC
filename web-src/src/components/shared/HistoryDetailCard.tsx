/*
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { COLORS, TYPOGRAPHY, SPACING } from '../../styles/designSystem'
import { HistoryRecord } from '../../types/domain'
import {
  formatTimestamp,
  getChangeDescription,
  getChangeIcon,
  getChangeColor,
  formatUserName,
  formatDiffValue,
  formatFieldName
} from './HistoryTimeline'

// ============================================================================
// DIFF DISPLAY COMPONENT
// ============================================================================

interface DiffDisplayProps {
  diff: HistoryRecord['diff']
}

const DiffDisplay: React.FC<DiffDisplayProps> = ({ diff }) => {
  if (!diff) {
    return (
      <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '12px', fontStyle: 'italic' }}>
        No detailed changes available
      </Text>
    )
  }

  const hasAdded = diff.added && Object.keys(diff.added).length > 0
  const hasUpdated = diff.updated && Object.keys(diff.updated).length > 0
  const hasDeleted = diff.deleted && Object.keys(diff.deleted).length > 0

  if (!hasAdded && !hasUpdated && !hasDeleted) {
    return (
      <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '12px', fontStyle: 'italic' }}>
        No detailed changes available
      </Text>
    )
  }

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
      {/* Added fields */}
      {hasAdded && (
        <div>
          <Text UNSAFE_style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--spectrum-global-color-green-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
            display: 'block'
          }}>
            Added
          </Text>
          <div
            style={{
              backgroundColor: 'rgba(45, 157, 120, 0.1)',
              borderLeft: '3px solid var(--spectrum-global-color-green-600)',
              padding: '8px 12px',
              borderRadius: '0 4px 4px 0'
            }}
          >
            {Object.entries(diff.added!).map(([key, value]) => (
              <div key={key} className={style({ display: 'flex', gap: 8 })} style={{ marginBottom: '4px' }}>
                <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500, color: COLORS.GRAY_800, minWidth: '120px' }}>
                  {formatFieldName(key)}:
                </Text>
                <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_700, wordBreak: 'break-word' }}>
                  {formatDiffValue(value)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Updated fields */}
      {hasUpdated && (
        <div>
          <Text UNSAFE_style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--spectrum-global-color-blue-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
            display: 'block'
          }}>
            Updated
          </Text>
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderLeft: '3px solid var(--spectrum-global-color-blue-500)',
              padding: '8px 12px',
              borderRadius: '0 4px 4px 0'
            }}
          >
            {Object.entries(diff.updated!).map(([key, value]) => (
              <div key={key} className={style({ display: 'flex', gap: 8 })} style={{ marginBottom: '4px' }}>
                <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500, color: COLORS.GRAY_800, minWidth: '120px' }}>
                  {formatFieldName(key)}:
                </Text>
                <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_700, wordBreak: 'break-word' }}>
                  {formatDiffValue(value)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deleted fields */}
      {hasDeleted && (
        <div>
          <Text UNSAFE_style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--spectrum-global-color-red-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
            display: 'block'
          }}>
            Deleted
          </Text>
          <div
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderLeft: '3px solid var(--spectrum-global-color-red-600)',
              padding: '8px 12px',
              borderRadius: '0 4px 4px 0'
            }}
          >
            {Object.entries(diff.deleted!).map(([key, value]) => (
              <div key={key} className={style({ display: 'flex', gap: 8 })} style={{ marginBottom: '4px' }}>
                <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 500, color: COLORS.GRAY_800, minWidth: '120px' }}>
                  {formatFieldName(key)}:
                </Text>
                <Text UNSAFE_style={{ fontSize: '12px', color: COLORS.GRAY_700, wordBreak: 'break-word', textDecoration: 'line-through' }}>
                  {formatDiffValue(value)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DETAIL CARD COMPONENT
// ============================================================================

interface DetailCardProps {
  record: HistoryRecord | null
  isLocked: boolean
}

export const DetailCard: React.FC<DetailCardProps> = ({ record, isLocked }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Reset details open state when record changes
  useEffect(() => {
    setIsDetailsOpen(false)
  }, [record?.timestamp])

  if (!record) {
    return (
      <div
        style={{
          padding: `${SPACING.MD}px`,
          textAlign: 'center',
          color: COLORS.GRAY_600
        }}
      >
        <Text>Hover over a point in the timeline to see details. Click to lock selection.</Text>
      </div>
    )
  }

  const changeColor = getChangeColor(record.changeType)
  const hasDiff = record.diff && (
    (record.diff.added && Object.keys(record.diff.added).length > 0) ||
    (record.diff.updated && Object.keys(record.diff.updated).length > 0) ||
    (record.diff.deleted && Object.keys(record.diff.deleted).length > 0)
  )

  return (
    <div
      style={{
        padding: `${SPACING.MD}px ${SPACING.LG}px`,
        backgroundColor: COLORS.GRAY_100,
        borderRadius: '8px',
        margin: `0 ${SPACING.LG}px`,
        border: isLocked ? `2px solid ${changeColor}` : '2px solid transparent'
      }}
    >
      <div
        className={style({ display: 'flex', gap: 24, alignItems: 'start' })}
      >
        {/* Change type icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: changeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.WHITE,
            flexShrink: 0
          }}
        >
          {getChangeIcon(record.changeType)}
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          <Text UNSAFE_style={{
            ...TYPOGRAPHY.SUBSECTION_HEADING,
            display: 'block',
            marginBottom: '4px'
          }}>
            {getChangeDescription(record)}
          </Text>
          <Text UNSAFE_style={{
            ...TYPOGRAPHY.HELPER_TEXT,
            display: 'block',
            marginBottom: '8px'
          }}>
            {formatTimestamp(record.timestamp)}
          </Text>

          {/* User info */}
          <div className={style({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' })}>
            <Text UNSAFE_style={{
              ...TYPOGRAPHY.HELPER_TEXT,
              color: COLORS.GRAY_600
            }}>
              By:
            </Text>
            <Text UNSAFE_style={{
              fontWeight: 500,
              color: COLORS.GRAY_800,
              fontSize: '13px'
            }}>
              {formatUserName(record.user)}
            </Text>
            {record.user.email && (
              <Text UNSAFE_style={{
                ...TYPOGRAPHY.HELPER_TEXT,
                color: COLORS.GRAY_600
              }}>
                ({record.user.email})
              </Text>
            )}
          </div>
        </div>

        {/* Change type badge */}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: changeColor,
            color: COLORS.WHITE,
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {record.changeType}
        </div>
      </div>

      {/* Collapsible Details Section */}
      {hasDiff && isLocked && (
        <div style={{ marginTop: `${SPACING.MD}px` }}>
          {/* Details toggle button */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: COLORS.WHITE,
              border: `1px solid ${COLORS.GRAY_300}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: COLORS.GRAY_700,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.GRAY_200
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.WHITE
            }}
          >
            <span style={{
              transform: isDetailsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block'
            }}>
              ▶
            </span>
            {isDetailsOpen ? 'Hide Details' : 'Show Details'}
          </button>

          {/* Collapsible content */}
          <div
            style={{
              maxHeight: isDetailsOpen ? '500px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, padding 0.3s ease',
              paddingTop: isDetailsOpen ? `${SPACING.MD}px` : '0'
            }}
          >
            <DiffDisplay diff={record.diff} />
          </div>
        </div>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <Text UNSAFE_style={{
          fontSize: '11px',
          color: COLORS.GRAY_600,
          marginTop: `${SPACING.SM}px`,
          fontStyle: 'italic'
        }}>
          Click another point to change selection, or click the same point to deselect.
        </Text>
      )}
    </div>
  )
}
