/* 
* <license header>
*/

import React from 'react'
import { Text } from '@adobe/react-spectrum'
import { COLORS } from '../../styles/designSystem'

interface StatusBadgeProps {
  status: string
  label?: string
}

interface StatusConfig {
  dotColor: string
  textColor: string
  label: string
}

/**
 * Status configuration using design system colors
 * Unified across FormWizard, SingleStepFormLayout, and dashboards
 */
const statusMap: Record<string, StatusConfig> = {
  // Series/Event/Session statuses - using design system colors
  draft: { 
    dotColor: COLORS.STATUS_DRAFT,     // #2D9D92 (teal)
    textColor: COLORS.GRAY_800, 
    label: 'Draft' 
  },
  active: { 
    dotColor: COLORS.STATUS_PUBLISHED,  // #CD3ACE (purple) - same as published
    textColor: COLORS.GRAY_800, 
    label: 'Active' 
  },
  published: { 
    dotColor: COLORS.STATUS_PUBLISHED, // #CD3ACE (purple)
    textColor: COLORS.GRAY_800, 
    label: 'Published' 
  },
  ongoing: { 
    dotColor: COLORS.STATUS_PUBLISHED, // #CD3ACE (purple) - active event
    textColor: COLORS.GRAY_800, 
    label: 'Ongoing' 
  },
  completed: { 
    dotColor: COLORS.GRAY_600,          // Gray for completed
    textColor: COLORS.GRAY_700, 
    label: 'Completed' 
  },
  archived: { 
    dotColor: COLORS.STATUS_ARCHIVED,   // #666666 (gray)
    textColor: COLORS.GRAY_700, 
    label: 'Archived' 
  },
  cancelled: { 
    dotColor: COLORS.STATUS_CANCELLED,  // #D7373F (red)
    textColor: COLORS.GRAY_800, 
    label: 'Cancelled' 
  },
  scheduled: { 
    dotColor: COLORS.STATUS_DRAFT,      // #2D9D92 (teal) - not yet started
    textColor: COLORS.GRAY_800, 
    label: 'Scheduled' 
  },
  unknown: { 
    dotColor: COLORS.GRAY_400,          // Light gray for unknown
    textColor: COLORS.GRAY_700, 
    label: 'Unknown' 
  },
  
  // Registration statuses
  confirmed: { 
    dotColor: COLORS.STATUS_PUBLISHED,  // #CD3ACE (purple) - confirmed/active
    textColor: COLORS.GRAY_800, 
    label: 'Confirmed' 
  },
  pending: { 
    dotColor: COLORS.STATUS_DRAFT,      // #2D9D92 (teal) - pending/draft
    textColor: COLORS.GRAY_800, 
    label: 'Pending' 
  },
  attended: { 
    dotColor: COLORS.GRAY_600,          // Gray for completed action
    textColor: COLORS.GRAY_700, 
    label: 'Attended' 
  }
}

/**
 * StatusBadge - Displays a status indicator with a colored dot and text
 * Uses design system colors for consistency across the platform
 * 
 * Simple, clean design for dashboards - just dot + text, no box
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const statusConfig = statusMap[status.toLowerCase()] || {
    dotColor: COLORS.GRAY_400,
    textColor: COLORS.GRAY_700,
    label: status
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: statusConfig.dotColor,
          flexShrink: 0
        }}
      />
      <Text
        UNSAFE_style={{
          fontSize: '14px',
          fontWeight: 500,
          color: statusConfig.textColor,
          whiteSpace: 'nowrap'
        }}
      >
        {label || statusConfig.label}
      </Text>
    </div>
  )
}

