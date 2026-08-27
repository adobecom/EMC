/*
* <license header>
*/

import React from 'react'
import { Badge, Button, Tab, TabList, Tabs, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import type { EncoreAct } from './types'

export const ACTS: EncoreAct[] = [
  { id: 'act0', num: 0, name: 'Setup', patent: null },
  { id: 'act1', num: 1, name: 'Forecast + Graph', patent: 'NE1 + NE2' },
  { id: 'act2', num: 2, name: 'Optimization', patent: 'NE6' },
  { id: 'act3', num: 3, name: 'Voice + Outreach', patent: 'NE5 + NE7' },
  { id: 'act4', num: 4, name: 'Audit Receipts', patent: 'NE8' },
  { id: 'act5', num: 5, name: 'Federation', patent: 'NE3 + NE19' },
  { id: 'act6', num: 6, name: 'Substitution', patent: 'NE11 + NE12' },
  { id: 'act7', num: 7, name: 'Summary', patent: null },
  { id: 'act8', num: 8, name: 'Deep Dives', patent: 'NE4, 9, 13, 16, 17, 21, 22, 23' }
]

interface EncoreStepperProps {
  activeId: string
  onActivate: (id: string) => void
  children: React.ReactNode
}

/** Tabs-based act picker + Prev/Next bar. Replaces the source demo's keyboard-driven autoplay controller. */
export const EncoreStepper: React.FC<EncoreStepperProps> = ({ activeId, onActivate, children }) => {
  const idx = ACTS.findIndex((a) => a.id === activeId)
  const cur = idx >= 0 ? ACTS[idx] : ACTS[0]
  const prev = idx > 0 ? ACTS[idx - 1] : null
  const next = idx >= 0 && idx < ACTS.length - 1 ? ACTS[idx + 1] : null

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
      <Tabs
        aria-label="ENCORE acts"
        selectedKey={activeId}
        onSelectionChange={(key) => onActivate(key as string)}
        density="compact"
      >
        <div
          style={{
            borderRadius: 12,
            backgroundColor: 'var(--s2-container-bg)',
            boxShadow: 'var(--emc-nav-card-shadow)',
            padding: '4px 0',
            marginBottom: 16
          }}
        >
          <TabList>
            {ACTS.map((a) => (
              <Tab key={a.id} id={a.id}>{`${a.num} · ${a.name}`}</Tab>
            ))}
          </TabList>
        </div>
        {children}
      </Tabs>

      <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 })}>
        <Button variant="secondary" fillStyle="outline" isDisabled={!prev} onPress={() => prev && onActivate(prev.id)}>
          <ChevronLeft />
          <Text>{prev ? `${prev.num}. ${prev.name}` : 'Start'}</Text>
        </Button>

        <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })}>
          <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
            {`Act ${cur.num} · ${cur.name}`}
          </Text>
          {cur.patent && <Badge variant="negative" size="S">{cur.patent}</Badge>}
        </div>

        <Button variant="accent" isDisabled={!next} onPress={() => next && onActivate(next.id)}>
          <Text>{next ? `${next.num}. ${next.name}` : 'End'}</Text>
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

export default EncoreStepper
