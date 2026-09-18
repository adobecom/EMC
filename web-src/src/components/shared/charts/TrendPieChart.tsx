/*
* <license header>
*/

import React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AggregatedPoint } from '../../../utils/dashboardAggregation'
import {
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '../../../styles/designSystem'

interface TrendPieChartProps {
  data: AggregatedPoint[]
  height?: number
}

export const TrendPieChart: React.FC<TrendPieChartProps> = ({ data, height = 280 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Tooltip
        contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {/* stroke="none": recharts' default white slice outline reads as a stray border, especially in dark theme */}
      <Pie data={data} dataKey="value" nameKey="label" outerRadius={100} stroke="none" label>
        {data.map((entry, index) => (
          <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
)
