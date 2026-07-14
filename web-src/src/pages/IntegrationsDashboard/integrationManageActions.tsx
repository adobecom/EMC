/*
* <license header>
*/

/**
 * integrationManageActions — builds the MANAGE column menu items for
 * IntegrationsDashboard's DataTable, mirroring the permission-gated menu
 * pattern used inline in EventsDashboard/SpeakersDashboard, factored into a
 * reusable helper since the integration row menu has more conditional
 * branches (enable/disable toggle, ping, view deliveries).
 */

import React from 'react'
import { MenuItem, Text } from '@react-spectrum/s2'
import Edit from '@react-spectrum/s2/icons/Edit'
import Play from '@react-spectrum/s2/icons/Play'
import Pause from '@react-spectrum/s2/icons/Pause'
import Send from '@react-spectrum/s2/icons/Send'
import History from '@react-spectrum/s2/icons/History'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import { IntegrationDashboardItem } from '../../types/webhookApi'

export type IntegrationManageAction =
  | 'edit'
  | 'toggle-enabled'
  | 'ping'
  | 'view-deliveries'
  | 'delete'

export interface BuildIntegrationManageActionsOptions {
  item: IntegrationDashboardItem
  canWrite: boolean
  canDelete: boolean
}

/**
 * Returns the list of `<MenuItem>` elements for a single integration row,
 * gated by `event:write`/`event:delete`-style permission booleans passed in
 * by the caller (dashboard owns the `useHasPermission('integration', ...)` checks).
 */
export function buildIntegrationManageActions({
  item,
  canWrite,
  canDelete,
}: BuildIntegrationManageActionsOptions): React.ReactElement[] {
  const items: React.ReactElement[] = []

  if (canWrite) {
    items.push(
      <MenuItem key="edit" id="edit" textValue="Edit">
        <Edit />
        <Text slot="label">Edit</Text>
      </MenuItem>
    )
    items.push(
      <MenuItem key="toggle-enabled" id="toggle-enabled" textValue={item.enabled ? 'Disable' : 'Enable'}>
        {item.enabled ? <Pause /> : <Play />}
        <Text slot="label">{item.enabled ? 'Disable' : 'Enable'}</Text>
      </MenuItem>
    )
    items.push(
      <MenuItem key="ping" id="ping" textValue="Ping">
        <Send />
        <Text slot="label">Ping</Text>
      </MenuItem>
    )
  }

  items.push(
    <MenuItem key="view-deliveries" id="view-deliveries" textValue="View deliveries">
      <History />
      <Text slot="label">View deliveries</Text>
    </MenuItem>
  )

  if (canDelete) {
    items.push(
      <MenuItem key="delete" id="delete" textValue="Delete">
        <RemoveCircle />
        <Text slot="label">Delete</Text>
      </MenuItem>
    )
  }

  return items
}
