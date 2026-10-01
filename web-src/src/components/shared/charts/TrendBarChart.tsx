/*
* <license header>
*/

import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AggregatedPoint } from '../../../utils/dashboardAggregation'
import { COLORS, CHART_TOOLTIP_CONTENT_STYLE, CHART_TOOLTIP_LABEL_STYLE } from '../../../styles/designSystem'

interface TrendBarChartProps {
  data: AggregatedPoint[]
  color?: string
  height?: number
}

export const TrendBarChart: React.FC<TrendBarChartProps> = ({ data, color = COLORS.BLUE_400, height = 280 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_300} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
      <Tooltip contentStyle={CHART_TOOLTIP_CONTENT_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
      <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
)
