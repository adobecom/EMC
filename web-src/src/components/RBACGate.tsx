/**
 * RBACGate — blocks rendering until API-driven group authorization is resolved.
 * Uses GroupContext (backend RBAC) instead of the old users.json system.
 *
 * Shows three possible gate screens:
 * 1. Loading spinner while groups are being fetched
 * 2. Group selection prompt when user has multiple groups and hasn't chosen
 * 3. Access denied when user has no groups
 */

import React, { ReactNode, useCallback, useRef, useState } from 'react'
import {
  Provider,
  defaultTheme,
  View,
  Flex,
} from '@adobe/react-spectrum'
import { Text, Button, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useGroup } from '../contexts/GroupContext'
import { GateScreen } from './shared/GateScreen'
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/designSystem'
const gateBg = new URL('../assets/gate-bg.png', import.meta.url).href

/** Gag: group gate card nudges away from the mouse so it is still catchable (clamped). */
const GROUP_GATE_DODGE_RADIUS = 200
const GROUP_GATE_DODGE_STRENGTH = 26
const GROUP_GATE_DODGE_DECAY = 0.88
const GROUP_GATE_MAX_OFFSET = 120

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
  const cardWrapRef = useRef<HTMLDivElement>(null)
  const [dodgeOffset, setDodgeOffset] = useState({ x: 0, y: 0 })

  const handleOverlayPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = cardWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = cx - e.clientX
    const dy = cy - e.clientY
    const dist = Math.hypot(dx, dy)

    setDodgeOffset(prev => {
      let nx = prev.x
      let ny = prev.y
      if (dist < GROUP_GATE_DODGE_RADIUS && dist > 0.5) {
        const pull = (GROUP_GATE_DODGE_RADIUS - dist) / GROUP_GATE_DODGE_RADIUS
        const ux = dx / dist
        const uy = dy / dist
        nx += ux * GROUP_GATE_DODGE_STRENGTH * pull
        ny += uy * GROUP_GATE_DODGE_STRENGTH * pull
      } else {
        nx *= GROUP_GATE_DODGE_DECAY
        ny *= GROUP_GATE_DODGE_DECAY
      }
      const clamp = (v: number) =>
        Math.max(-GROUP_GATE_MAX_OFFSET, Math.min(GROUP_GATE_MAX_OFFSET, v))
      return { x: clamp(nx), y: clamp(ny) }
    })
  }, [])

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

  return (
    // Plain div: fullscreen gate + pointer tracking (Spectrum View does not forward onPointerMove)
    <div style={outerStyle} onPointerMove={handleOverlayPointerMove}>
      <div
        ref={cardWrapRef}
        style={{
          width: 'fit-content',
          maxWidth: '100%',
          transform: `translate3d(${dodgeOffset.x}px, ${dodgeOffset.y}px, 0)`,
          willChange: 'transform',
        }}
      >
      <Flex
        direction="column"
        alignItems="center"
        gap="size-200"
        UNSAFE_style={{
          // UNSAFE_style needed: backdrop blur, rgba background, and box-shadow not available via Spectrum props
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          minWidth: `${SPACING.HUGE * 3}px`,
          maxWidth: '520px',
          padding: `${SPACING.HUGE}px`,
          borderRadius: `${SPACING.XS}px`,
        }}
      >
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

        <View width="100%" UNSAFE_style={{ margin: SPACING.MD }}>
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
        </View>

        <Flex gap="size-200">
          <Button
            variant="accent"
            onPress={() => selectedId && setActiveGroup(selectedId)}
            isDisabled={!selectedId}
          >
            Continue
          </Button>
        </Flex>
      </Flex>
      </div>
    </div>
  )
}

export const RBACGate: React.FC<RBACGateProps> = ({ children }) => {
  const { groups, isLoading, error, needsGroupSelection, refreshGroups } = useGroup()

  if (isLoading) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen onRequestAccess={() => {}} isLoading />
      </Provider>
    )
  }

  if (error || groups.length === 0) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen
          onRequestAccess={() => refreshGroups()}
          message="You don't have access to the Events Management Console. Contact your administrator to be added to a group."
          actionLabel="Retry"
        />
      </Provider>
    )
  }

  if (needsGroupSelection) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GroupSelectionScreen />
      </Provider>
    )
  }

  return <>{children}</>
}

export default RBACGate
