/*
* <license header>
*/

import React, { useState } from 'react'
import { ActionButton, Button, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import ChevronUp from '@react-spectrum/s2/icons/ChevronUp'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import Edit from '@react-spectrum/s2/icons/Edit'
import Delete from '@react-spectrum/s2/icons/Delete'
import { useDashboard } from '../../contexts'
import { Dashboard, Widget } from '../../types/dashboard'
import { CHART_COLORS } from '../../styles/designSystem'
import { WidgetBuilder } from './WidgetBuilder'
import { WidgetPreview } from './WidgetPreview'

interface DashboardCanvasProps {
  dashboard: Dashboard
}

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({ dashboard }) => {
  const { moveWidget, removeWidget } = useDashboard()
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
      {dashboard.widgets.length === 0 && (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          No widgets yet — add your first chart.
        </Text>
      )}

      {dashboard.widgets.map((widget, index) => (
        <div
          key={widget.id}
          className={`dashboard-widget ${style({
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'gray-300',
            borderRadius: 'sm',
            padding: 16,
          })}`}
        >
          <div
            className={style({
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            })}
          >
            <Text UNSAFE_style={{ fontWeight: 700, fontSize: 16 }}>{widget.title}</Text>
            <div className={`no-print ${style({ display: 'flex', gap: 4 })}`}>
              <ActionButton
                isQuiet
                aria-label="Move widget up"
                isDisabled={index === 0}
                onPress={() => moveWidget(dashboard.id, widget.id, 'up')}
              >
                <ChevronUp />
              </ActionButton>
              <ActionButton
                isQuiet
                aria-label="Move widget down"
                isDisabled={index === dashboard.widgets.length - 1}
                onPress={() => moveWidget(dashboard.id, widget.id, 'down')}
              >
                <ChevronDown />
              </ActionButton>
              <ActionButton isQuiet aria-label="Edit widget" onPress={() => setEditingWidget(widget)}>
                <Edit />
              </ActionButton>
              <ActionButton isQuiet aria-label="Delete widget" onPress={() => removeWidget(dashboard.id, widget.id)}>
                <Delete />
              </ActionButton>
            </div>
          </div>
          <WidgetPreview widget={widget} color={CHART_COLORS[index % CHART_COLORS.length]} />
        </div>
      ))}

      <div className="no-print">
        <Button variant="secondary" onPress={() => setIsAdding(true)}>Add widget</Button>
      </div>

      <WidgetBuilder
        dashboardId={dashboard.id}
        isOpen={isAdding}
        onOpenChange={setIsAdding}
      />

      <WidgetBuilder
        dashboardId={dashboard.id}
        widget={editingWidget ?? undefined}
        isOpen={!!editingWidget}
        onOpenChange={(open) => !open && setEditingWidget(null)}
      />
    </div>
  )
}
