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
// @ts-ignore — Fonts not in package exports for v0.12.0
import { Fonts } from '@react-spectrum/s2/dist/Fonts.mjs'
import { Provider as S2Provider, Text, Button, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useGroup } from '../contexts/GroupContext'
import { GateScreen } from './shared/GateScreen'
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/designSystem'
const gateBg = new URL('../assets/gate-bg.png', import.meta.url).href

interface RBACGateProps {
  children: ReactNode
}

/**
 * Group selection screen — shown when the user belongs to multiple groups
 * and hasn't previously selected one.
 */
const GroupSelectionScreen: React.FC = () => {
  const { groups, setActiveGroup } = useGroup()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // UNSAFE_style needed: fixed fullscreen overlay is not expressible via Spectrum props
  const outerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${gateBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center'
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.90)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
    minWidth: `${SPACING.HUGE * 3}px`,
    maxWidth: '520px',
    padding: `${SPACING.HUGE}px`,
    borderRadius: `${SPACING.XS}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  }

  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        <Text
          UNSAFE_style={{
            ...TYPOGRAPHY.COMPONENT_HEADING,
            color: COLORS.DARK_GRAY,
            fontWeight: 600
          }}
        >
          Events Management Console
        </Text>

        <Text
          UNSAFE_style={{
            ...TYPOGRAPHY.SECTION_DESCRIPTION,
            color: COLORS.DARK_GRAY,
            maxWidth: 420
          }}
        >
          You belong to multiple groups. Select a group to continue.
        </Text>

        <div style={{ width: '100%', margin: SPACING.MD }}>
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

        <div style={{ display: 'flex', gap: 16 }}>
          <Button
            variant="accent"
            onPress={() => selectedId && setActiveGroup(selectedId)}
            isDisabled={!selectedId}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

export const RBACGate: React.FC<RBACGateProps> = ({ children }) => {
  const { groups, isLoading, error, needsGroupSelection, refreshGroups } = useGroup()

  if (isLoading) {
    return (
      <S2Provider colorScheme="light">
        <Fonts />
        <GateScreen onRequestAccess={() => {}} isLoading />
      </S2Provider>
    )
  }

  if (error || groups.length === 0) {
    return (
      <S2Provider colorScheme="light">
        <Fonts />
        <GateScreen
          onRequestAccess={() => refreshGroups()}
          message="You don't have access to the Events Management Console. Contact your administrator to be added to a group."
          actionLabel="Retry"
        />
      </S2Provider>
    )
  }

  if (needsGroupSelection) {
    return (
      <S2Provider colorScheme="light">
        <Fonts />
        <GroupSelectionScreen />
      </S2Provider>
    )
  }

  return <>{children}</>
}

export default RBACGate
