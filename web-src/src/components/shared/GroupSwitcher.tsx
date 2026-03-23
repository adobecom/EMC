/**
 * GroupSwitcher — Picker to switch the active RBAC group.
 *
 * Displayed in the TopNav. Shows the active group name and lets users
 * with multiple groups switch between them. Always visible when groups
 * are loaded (single group shows as read-only Picker).
 */

import React from 'react'
import { Picker, Item, Text, Flex, Divider } from '@adobe/react-spectrum'
import { useGroup } from '../../contexts/GroupContext'

export const GroupSwitcher: React.FC = () => {
  const { groups, activeGroup, setActiveGroup, isLoading } = useGroup()

  // Don't render if loading or no groups
  if (isLoading || groups.length === 0 || !activeGroup) return null

  return (
    <Flex alignItems="center" gap="size-150">
      <Divider orientation="vertical" size="S" UNSAFE_style={{ height: 24 }} />
      <Picker
        label="Group"
        labelPosition="side"
        selectedKey={activeGroup.groupId}
        onSelectionChange={(key) => setActiveGroup(key as string)}
        width="size-3000"
        isDisabled={groups.length === 1}
      >
        {groups.map(group => (
          <Item key={group.groupId} textValue={group.name}>
            <Text>{group.name}</Text>
            {group.scopeName && <Text slot="description">{group.scopeName}</Text>}
          </Item>
        ))}
      </Picker>
    </Flex>
  )
}
