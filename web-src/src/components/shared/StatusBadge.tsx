/*
* <license header>
*/

import React from 'react'
import { StatusLight } from '@react-spectrum/s2'

interface StatusBadgeProps {
  status: string
  label?: string
}

interface StatusConfig {
  variant: 'positive' | 'negative' | 'notice' | 'neutral' | 'informative'
  label: string
}

const statusMap: Record<string, StatusConfig> = {
  // Series/Event/Session statuses
  draft:     { variant: 'neutral',     label: 'Draft' },
  active:    { variant: 'positive',    label: 'Active' },
  published: { variant: 'positive',    label: 'Published' },
  ongoing:   { variant: 'positive',    label: 'Ongoing' },
  completed: { variant: 'neutral',     label: 'Completed' },
  archived:  { variant: 'neutral',     label: 'Archived' },
  cancelled: { variant: 'negative',    label: 'Cancelled' },
  scheduled: { variant: 'informative', label: 'Scheduled' },
  unknown:   { variant: 'neutral',     label: 'Unknown' },

  // Registration statuses
  confirmed: { variant: 'positive',    label: 'Confirmed' },
  pending:   { variant: 'notice',      label: 'Pending' },
  attended:  { variant: 'neutral',     label: 'Attended' },
  declined:  { variant: 'negative',    label: 'Declined' },

  // Guest RSVP link statuses
  unused:    { variant: 'informative', label: 'Unused' },
  redeemed:  { variant: 'positive',    label: 'Redeemed' },
  expired:   { variant: 'neutral',     label: 'Expired' },
  revoked:   { variant: 'negative',    label: 'Revoked' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = statusMap[status.toLowerCase()] ?? { variant: 'neutral' as const, label: status }

  return (
    <StatusLight variant={config.variant}>
      {label ?? config.label}
    </StatusLight>
  )
}
