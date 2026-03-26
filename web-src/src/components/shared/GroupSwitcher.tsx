/**
 * GroupSwitcher — Picker to switch the active RBAC group.
 *
 * Displayed in the TopNav. Shows the active group name and lets users
 * with multiple groups switch between them. Always visible when groups
 * are loaded (single group shows as read-only Picker).
 */

import React from 'react'
import { Picker, PickerItem, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useGroup } from '../../contexts/GroupContext'

export const GroupSwitcher: React.FC = () => {
  const { groups, activeGroup, setActiveGroup, isLoading } = useGroup()

  // Don't render if loading or no groups
  if (isLoading || groups.length === 0 || !activeGroup) return null

  return (
    <div className={style({ display: 'flex', alignItems: 'center', gap: 12 })}>
      <div
        className={style({ width: 1, height: 24, flexShrink: 0, backgroundColor: 'gray-300' })}
        role="separator"
        aria-orientation="vertical"
      />
      <Picker
        label="Group"
        labelPosition="side"
        selectedKey={activeGroup.groupId}
        onSelectionChange={(key) => setActiveGroup(key as string)}
        styles={style({ width: 240 })}
        isDisabled={groups.length === 1}
      >
        {groups.map(group => (
          <PickerItem key={group.groupId} id={group.groupId} textValue={group.name}>
            <Text>{group.name}</Text>
            {group.scopeName ? <Text slot="description">{group.scopeName}</Text> : null}
          </PickerItem>
        ))}
      </Picker>
    </div>
  )
}
