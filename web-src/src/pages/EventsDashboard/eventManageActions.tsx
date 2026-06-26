/*
* <license header>
*/

import React from 'react'
import Publish from '@react-spectrum/s2/icons/Publish'
import PublishNo from '@react-spectrum/s2/icons/PublishNo'
import Preview from '@react-spectrum/s2/icons/Preview'
import Copy from '@react-spectrum/s2/icons/Copy'
import Edit from '@react-spectrum/s2/icons/Edit'
import Duplicate from '@react-spectrum/s2/icons/Duplicate'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import { EventDashboardItem } from '../../types/domain'

export interface EventManageAction {
  key: string
  label: string
  icon: React.ReactNode
}

/**
 * Builds the ordered list of manage actions for a given event item,
 * respecting write and delete permissions. The action keys match those
 * handled by EventsDashboard's handleMenuAction switch statement.
 */
export function buildEventManageActions({
  item,
  canWriteEvent,
  canDeleteEvent,
}: {
  item: EventDashboardItem
  canWriteEvent: boolean
  canDeleteEvent: boolean
}): EventManageAction[] {
  const actions: EventManageAction[] = []

  if (canWriteEvent) {
    actions.push(
      { key: 'edit', label: 'Edit', icon: <Edit /> },
      {
        key: item.published ? 'unpublish' : 'publish',
        label: item.published ? 'Unpublish' : 'Publish',
        icon: item.published ? <PublishNo /> : <Publish />,
      },
      { key: 'clone', label: 'Clone', icon: <Duplicate /> }
    )
  }

  actions.push(
    { key: 'preview-pre', label: 'Preview pre-event', icon: <Preview /> },
    { key: 'preview-post', label: 'Preview post-event', icon: <Preview /> },
    { key: 'copy-url', label: 'Copy URL', icon: <Copy /> }
  )

  if (canDeleteEvent) {
    actions.push({ key: 'delete', label: 'Delete', icon: <RemoveCircle /> })
  }

  return actions
}
