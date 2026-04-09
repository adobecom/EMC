/**
 * RBACGate — blocks rendering until API-driven group authorization is resolved.
 * Uses GroupContext (backend RBAC) instead of the old users.json system.
 *
 * Shows three possible gate screens:
 * 1. Loading spinner while groups are being fetched
 * 2. Group selection prompt when user has multiple groups and hasn't chosen
 * 3. Access denied when user has no groups
 */

import React, { ReactNode, useState } from 'react'
import {
  Text,
  Button,
  CustomDialog,
  Heading,
  Picker,
  PickerItem,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useGroup } from '../contexts/GroupContext'
import { GateScreen, GateDialogShell } from './shared/GateScreen'
import { TYPOGRAPHY } from '../styles/designSystem'

interface RBACGateProps {
  children: ReactNode
}

const groupGateLayout = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  rowGap: 16,
  width: 'full',
  boxSizing: 'border-box',
})

const groupGateTitle = style({
  font: 'heading-lg',
  textAlign: 'center',
  marginY: 0,
})

const pickerRow = style({ width: 'full', maxWidth: 480 })

/**
 * Group selection screen — shown when the user belongs to multiple groups
 * and hasn't previously selected one.
 */
const GroupSelectionScreen: React.FC = () => {
  const { groups, setActiveGroup } = useGroup()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <GateDialogShell>
      <CustomDialog size="L" isDismissible={false} isKeyboardDismissDisabled>
        <div className={groupGateLayout}>
          <Heading slot="title" styles={groupGateTitle}>
            Events Management Console
          </Heading>
          <Text
            UNSAFE_style={{
              ...TYPOGRAPHY.SECTION_DESCRIPTION,
              textAlign: 'center',
            }}
          >
            You belong to multiple groups. Select a group to continue.
          </Text>
          <div className={pickerRow}>
            <Picker
              label="Group"
              selectedKey={selectedId}
              onSelectionChange={(key) => setSelectedId(key as string)}
              styles={style({ width: '[100%]' })}
            >
              {groups.map(group => (
                <PickerItem key={group.groupId} id={group.groupId} textValue={group.name}>
                  <Text>{group.name}</Text>
                  <Text slot="description">{group.scopeName || ''}</Text>
                </PickerItem>
              ))}
            </Picker>
          </div>
          <Button
            variant="accent"
            onPress={() => selectedId && setActiveGroup(selectedId)}
            isDisabled={!selectedId}
          >
            Continue
          </Button>
        </div>
      </CustomDialog>
    </GateDialogShell>
  )
}

export const RBACGate: React.FC<RBACGateProps> = ({ children }) => {
  const { groups, isLoading, error, needsGroupSelection, refreshGroups } = useGroup()

  if (isLoading) {
    return <GateScreen onRequestAccess={() => {}} isLoading />
  }

  if (error || groups.length === 0) {
    return (
      <GateScreen
        onRequestAccess={() => refreshGroups()}
        message="You don't have access to the Events Management Console. Contact your administrator to be added to a group."
        actionLabel="Retry"
      />
    )
  }

  if (needsGroupSelection) {
    return <GroupSelectionScreen />
  }

  return <>{children}</>
}

export default RBACGate
