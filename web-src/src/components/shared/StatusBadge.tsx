/* 
* <license header>
*/

import React from 'react'
import { StatusLight } from '@adobe/react-spectrum'

type StatusVariant = 'positive' | 'negative' | 'notice' | 'info' | 'neutral'

interface StatusBadgeProps {
  status: string
  label?: string
}

const statusMap: Record<string, { variant: StatusVariant; label: string }> = {
  // Series/Event/Session statuses
  draft: { variant: 'neutral', label: 'Draft' },
  active: { variant: 'positive', label: 'Active' },
  published: { variant: 'positive', label: 'Published' },
  ongoing: { variant: 'info', label: 'Ongoing' },
  completed: { variant: 'neutral', label: 'Completed' },
  archived: { variant: 'neutral', label: 'Archived' },
  cancelled: { variant: 'negative', label: 'Cancelled' },
  scheduled: { variant: 'notice', label: 'Scheduled' },
  
  // Registration statuses
  confirmed: { variant: 'positive', label: 'Confirmed' },
  pending: { variant: 'notice', label: 'Pending' },
  attended: { variant: 'info', label: 'Attended' }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const statusConfig = statusMap[status.toLowerCase()] || {
    variant: 'neutral' as StatusVariant,
    label: status
  }

  return (
    <StatusLight variant={statusConfig.variant}>
      {label || statusConfig.label}
    </StatusLight>
  )
}

