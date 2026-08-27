/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, Button, Heading, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { DataTable, TableColumn } from '../../../components/shared/DataTable'
import { ActHeader } from '../ActHeader'
import { pastEvents, targetEvent } from '../data/pastEvents'
import type { PastEvent } from '../types'

interface Act0SetupProps {
  onNavigate: (actId: string) => void
}

const columns: TableColumn<PastEvent>[] = [
  { key: 'name', name: 'Event' },
  { key: 'city', name: 'City' },
  { key: 'attendees', name: 'Attendees', render: (e) => e.attendees.toLocaleString() },
  { key: 'nps', name: 'NPS' },
  { key: 'sessions', name: 'Sessions' },
  { key: 'sponsors', name: 'Sponsors' }
]

export const Act0Setup: React.FC<Act0SetupProps> = ({ onNavigate }) => {
  const [created, setCreated] = useState(false)

  return (
    <>
      <ActHeader
        num={0}
        title="Familiar CRUD Platform"
        subtitle="The 'before' baseline. Ten years of past events, sessions, and outcomes ready for the next slate."
      />

      <div className={style({ display: 'grid', gap: 20 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 })}>
            <Text UNSAFE_style={{ fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)' }}>
              Past Events
            </Text>
            <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
              {pastEvents.length} records · 12,000+ sessions historic
            </Text>
          </div>
          <DataTable
            columns={columns}
            data={created ? [...pastEvents, {
              id: targetEvent.id,
              name: targetEvent.name,
              city: targetEvent.city,
              attendees: targetEvent.attendeesForecast,
              nps: 0,
              sessions: targetEvent.sessions,
              sponsors: targetEvent.sponsors.length,
              status: targetEvent.status
            }] : pastEvents}
            getItemKey={(e) => e.id}
          />
        </div>

        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
          <div
            style={{
              borderRadius: 12,
              backgroundColor: 'var(--s2-container-bg)',
              boxShadow: 'var(--emc-nav-card-shadow)',
              padding: 20
            }}
          >
            <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)' }}>
              Create Event
            </Text>
            <Heading level={3} UNSAFE_style={{ marginTop: 4, marginBottom: 0 }}>{targetEvent.name}</Heading>
            <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
              {targetEvent.dates} · {targetEvent.city}
            </Text>

            <div className={style({ display: 'grid', gap: 12, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <Field label="Attendees forecast" value={targetEvent.attendeesForecast.toLocaleString()} />
              <Field label="Session slots" value={String(targetEvent.sessions)} />
              <Field label="Speaker budget" value={`$${(targetEvent.speakerBudgetUsd / 1000).toFixed(0)}K`} />
              <Field label="Sponsors" value={String(targetEvent.sponsors.length)} />
            </div>

            <div style={{ marginTop: 16 }}>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 8 }}>
                Audience persona mix
              </Text>
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                {targetEvent.personas.map((p) => (
                  <div key={p.id} className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                    <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{p.label}</Text>
                    <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })} style={{ width: 128 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--spectrum-global-color-gray-200)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.pct * 100}%`, backgroundColor: 'var(--spectrum-global-color-blue-600)' }} />
                      </div>
                      <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', width: 28, textAlign: 'right' }}>
                        {Math.round(p.pct * 100)}%
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 8 }}>
                Sponsors
              </Text>
              <div className={style({ display: 'flex', flexWrap: 'wrap', gap: 8 })}>
                {targetEvent.sponsors.map((s) => (
                  <Badge key={s} variant="informative" size="S">{s}</Badge>
                ))}
              </div>
            </div>

            {!created ? (
              <Button variant="primary" styles={style({ width: 'full', marginTop: 20 })} onPress={() => setCreated(true)}>
                Save event
              </Button>
            ) : (
              <Button variant="accent" styles={style({ width: 'full', marginTop: 20 })} onPress={() => onNavigate('act1')}>
                Open with ENCORE →
              </Button>
            )}
          </div>

          <div
            style={{
              borderRadius: 12,
              backgroundColor: 'var(--spectrum-global-color-gray-75)',
              padding: 16
            }}
          >
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
              BASELINE
            </Text>
            <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>
              This act uses only the existing CRUD. Act 1 onward is the ENCORE service layer.
              The &quot;Open with ENCORE&quot; button is the patent moment trigger.
            </Text>
          </div>
        </div>
      </div>
    </>
  )
}

const Field: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div>
    <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
      {label}
    </Text>
    <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--spectrum-global-color-gray-900)' }}>{value}</Text>
  </div>
)

export default Act0Setup
