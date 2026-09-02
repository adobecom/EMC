/*
* <license header>
*/

import React from 'react'
import { Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { COLORS, TYPOGRAPHY } from '../../../styles/designSystem'

interface StatTileProps {
  title: string
  value: number
}

/** Mirrors OverviewDashboard's StatCard visual language for single-number widgets. */
export const StatTile: React.FC<StatTileProps> = ({ title, value }) => (
  <div
    style={{
      backgroundColor: 'var(--spectrum-global-color-gray-50)',
      border: `1px solid ${COLORS.GRAY_200}`,
      borderRadius: '8px',
      padding: 24,
      minHeight: '140px',
    }}
  >
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
      <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, color: COLORS.GRAY_700 }}>
        {title}
      </Text>
      <Text UNSAFE_style={{ fontSize: '42px', fontWeight: 700, color: COLORS.DARK_GRAY, lineHeight: 1.1 }}>
        {Number.isInteger(value) ? value : value.toFixed(2)}
      </Text>
    </div>
  </div>
)
