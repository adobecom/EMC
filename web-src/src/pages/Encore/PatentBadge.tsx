/*
* <license header>
*/

import React from 'react'
import { Badge, Text } from '@react-spectrum/s2'
import type { BadgeProps } from '@react-spectrum/s2'

export type PatentBadgeAccent = 'red' | 'navy' | 'mint' | 'steel'

const ACCENT_VARIANT: Record<PatentBadgeAccent, BadgeProps['variant']> = {
  red: 'negative',
  navy: 'informative',
  mint: 'positive',
  steel: 'neutral'
}

interface PatentBadgeProps {
  label: string
  accent?: PatentBadgeAccent
  children: React.ReactNode
}

/** A "patent moment" callout — labels the panel-visible novelty points of each act. */
export const PatentBadge: React.FC<PatentBadgeProps> = ({ label, accent = 'red', children }) => {
  return (
    <div
      style={{
        borderRadius: 8,
        backgroundColor: 'var(--spectrum-global-color-gray-75)',
        padding: 16,
        margin: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div>
        <Badge variant={ACCENT_VARIANT[accent]} size="S">{label}</Badge>
      </div>
      <Text UNSAFE_style={{ fontSize: 14, color: 'var(--spectrum-global-color-gray-800)' }}>
        {children}
      </Text>
    </div>
  )
}

export default PatentBadge
