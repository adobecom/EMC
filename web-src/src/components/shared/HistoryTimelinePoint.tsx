/* 
* <license header>
*/

import React from 'react'
import { Text } from '@adobe/react-spectrum'
import { COLORS, SPACING } from '../../styles/designSystem'
import { HistoryRecord } from '../../types/domain'
import { getChangeColor } from './HistoryTimeline'

interface TimelinePointProps {
  record: HistoryRecord
  index: number
  isHovered: boolean
  isLocked: boolean
  onHover: (index: number | null) => void
  onClick: (index: number) => void
}

export const TimelinePoint: React.FC<TimelinePointProps> = ({
  record,
  index,
  isHovered,
  isLocked,
  onHover,
  onClick
}) => {
  const changeColor = getChangeColor(record.changeType)
  const isFirst = index === 0
  const isActive = isHovered || isLocked
  
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '100px',
        cursor: 'pointer',
        padding: `${SPACING.MD}px ${SPACING.SM}px`,
      }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(index)}
    >
      {/* Connecting line (before) */}
      {!isFirst && (
        <div
          style={{
            position: 'absolute',
            top: '22px',
            right: '50%',
            width: '100%',
            height: '3px',
            backgroundColor: COLORS.GRAY_300,
            zIndex: 0
          }}
        />
      )}
      
      {/* Timeline dot */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isActive ? changeColor : COLORS.GRAY_600,
          border: `3px solid ${isActive ? changeColor : COLORS.GRAY_400}`,
          boxShadow: isLocked ? `0 0 12px ${changeColor}` : 'none',
          transition: 'all 0.2s ease',
          zIndex: 1,
          position: 'relative',
          cursor: 'pointer'
        }}
      />
      
      {/* Timestamp label (always visible) */}
      <Text
        UNSAFE_style={{
          fontSize: '11px',
          marginTop: `${SPACING.SM}px`,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          color: isActive ? COLORS.GRAY_800 : COLORS.GRAY_600,
          fontWeight: isActive ? 600 : 400,
          transition: 'all 0.2s ease'
        }}
      >
        {new Date(record.timestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        })}
      </Text>
    </div>
  )
}
