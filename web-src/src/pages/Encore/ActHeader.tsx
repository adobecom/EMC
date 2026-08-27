/*
* <license header>
*/

import React from 'react'
import { Badge, Heading, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }

interface ActHeaderProps {
  num: number
  title: string
  subtitle?: string
  patent?: string | null
}

export const ActHeader: React.FC<ActHeaderProps> = ({ num, title, subtitle, patent }) => {
  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 })}>
      <div className={style({ display: 'flex', alignItems: 'baseline', gap: 12 })}>
        <Text
          UNSAFE_style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}
        >
          Act {num}
        </Text>
        {patent && <Badge variant="negative" size="S">{patent}</Badge>}
      </div>
      <Heading level={1}>{title}</Heading>
      {subtitle && <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>{subtitle}</Text>}
      <div
        style={{ height: 3, width: 64, borderRadius: 4, backgroundColor: 'var(--spectrum-global-color-red-600)' }}
      />
    </div>
  )
}

export default ActHeader
