/*
* <license header>
*/

import React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AggregatedPoint } from '../../../utils/dashboardAggregation'
import { COLORS, CHART_TOOLTIP_CONTENT_STYLE, CHART_TOOLTIP_LABEL_STYLE } from '../../../styles/designSystem'

interface TrendLineChartProps {
  data: AggregatedPoint[]
  color?: string
  height?: number
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ data, color = COLORS.BLUE_400, height = 280 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRAY_300} />
      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
      <Tooltip contentStyle={CHART_TOOLTIP_CONTENT_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
)
