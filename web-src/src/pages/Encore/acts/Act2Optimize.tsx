/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, Button, Text } from '@react-spectrum/s2'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { DemoProgressBar } from '../DemoProgressBar'
import { SpeakerAvatar } from '../SpeakerAvatar'
import { primarySlate, slateMetrics, paretoAlternatives } from '../data/slate'
import { candidateSpeakers, combinedScore } from '../data/speakers'
import { targetEvent } from '../data/pastEvents'
import type { SlateMetrics, SlateRow } from '../types'

type Phase = 'idle' | 'solving' | 'done'

interface Act2OptimizeProps {
  onNavigate: (actId: string) => void
}

export const Act2Optimize: React.FC<Act2OptimizeProps> = ({ onNavigate }) => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [selected, setSelected] = useState<SlateRow | null>(null)

  return (
    <>
      <ActHeader
        num={2}
        title="Three-Sided MIP Slate Optimization"
        subtitle="Engagement + sponsor coverage + persona mix, jointly optimized under budget, time slots, diversity, and geography."
        patent="NE6"
      />

      {phase === 'idle' && (
        <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 24 }}>
          <Text UNSAFE_style={{ fontSize: 14, color: 'var(--spectrum-global-color-gray-800)' }}>
            We pass the calibrated forecasts + sponsor objectives + persona-mix targets into the MIP solver
            (OR-Tools), under {targetEvent.sessions} time-slot, ${(targetEvent.speakerBudgetUsd / 1000).toFixed(0)}K
            budget, and diversity constraints. The solver returns the slate plus per-inclusion justifications and
            Pareto alternatives.
          </Text>
          <div style={{ marginTop: 16 }}>
            <Button variant="accent" onPress={() => setPhase('solving')}>
              <Text>Generate slate →</Text>
            </Button>
          </div>
        </div>
      )}

      {phase === 'solving' && (
        <DemoProgressBar label="Solving 3-sided MIP across 800 candidates and 12 slots…" durationMs={2600} onDone={() => setPhase('done')} />
      )}

      {phase === 'done' && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SlateMetricsRow m={slateMetrics} />

            <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 16 }}>
              <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)', marginBottom: 12 }}>
                Primary slate · 12 sessions
              </Text>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {primarySlate.map((row) => {
                  const sp = candidateSpeakers.find((x) => x.id === row.speakerId)
                  if (!sp) return null
                  const isSel = selected?.slot === row.slot
                  return (
                    <button
                      key={row.slot}
                      onClick={() => setSelected(row)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 8,
                        border: `2px solid ${isSel ? 'var(--spectrum-global-color-red-600)' : 'var(--spectrum-global-color-gray-300)'}`,
                        backgroundColor: isSel ? 'var(--spectrum-global-color-blue-100)' : 'var(--s2-container-bg)',
                        cursor: 'pointer',
                        font: 'inherit'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SpeakerAvatar initials={sp.avatar} color={sp.avatarBg} size={28} />
                        <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>
                          {row.day} · {row.time}
                        </Text>
                      </div>
                      <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-900)', marginTop: 6 }}>
                        {sp.name}
                      </Text>
                      <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 2 }}>
                        {row.sessionTitle}
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--spectrum-global-color-red-600)' }}>
                          {combinedScore(sp).toFixed(2)}
                        </Text>
                        {row.sponsorsCovered.map((s) => (
                          <Badge key={s} variant="notice" size="S">{s}</Badge>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <PatentBadge label="NE6 PATENT MOMENT" accent="navy">
              Click any session card to see per-inclusion justification: which constraints were binding,
              which sponsor objectives that inclusion covers, and which audience persona it serves.
              Spreadsheet vendors cannot produce this audit trail.
            </PatentBadge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selected ? (
              <JustificationPanel row={selected} />
            ) : (
              <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
                <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)' }}>
                  Per-Inclusion Justification
                </Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
                  Click any session card to see why this speaker was selected for this slot.
                </Text>
              </div>
            )}

            <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)' }}>
                Pareto-Frontier Alternatives
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>
                When objectives are in tension, ENCORE returns alternatives with explicit trade-offs.
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {paretoAlternatives.map((p) => (
                  <div key={p.name} style={{ border: '1px solid var(--spectrum-global-color-gray-300)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text UNSAFE_style={{ fontSize: 13, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{p.name}</Text>
                      <Text UNSAFE_style={{ fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>Budget {Math.round(p.budgetPct * 100)}%</Text>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>Engagement:</Text>
                      <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{p.engagement.toFixed(2)}</Text>
                      <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>Sponsor:</Text>
                      <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{p.sponsorCoverage}</Text>
                    </div>
                    <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontStyle: 'italic', color: 'var(--spectrum-global-color-gray-600)', marginTop: 6 }}>
                      {p.tradeoff}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="accent" onPress={() => onNavigate('act3')}>
              <Text>Accept slate → Send invitations</Text>
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

const SlateMetricsRow: React.FC<{ m: SlateMetrics }> = ({ m }) => {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <Tile stat={m.totalEngagementPSum.toFixed(2)} label="Sum of forecast p̂" accent="navy" />
      <Tile stat={m.sponsorCoverage} label="Sponsor coverage" accent="red" />
      <Tile stat={`$${(m.budgetUsedUsd / 1000).toFixed(0)}K`} label={`of $${(targetEvent.speakerBudgetUsd / 1000).toFixed(0)}K`} accent="navy" />
      <Tile stat={`${m.solverMs} ms`} label="Solver time" accent="mint" />
    </div>
  )
}

const TILE_BG: Record<'navy' | 'red' | 'mint', string> = {
  navy: 'var(--spectrum-global-color-blue-600)',
  red: 'var(--spectrum-global-color-red-600)',
  mint: 'var(--spectrum-global-color-green-600)'
}

const Tile: React.FC<{ stat: string, label: string, accent: 'navy' | 'red' | 'mint' }> = ({ stat, label, accent }) => (
  <div style={{ borderRadius: 8, padding: 12, backgroundColor: TILE_BG[accent], color: 'white' }}>
    <Text UNSAFE_style={{ display: 'block', fontSize: 20, fontWeight: 700, color: 'white' }}>{stat}</Text>
    <Text UNSAFE_style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{label}</Text>
  </div>
)

const JustificationPanel: React.FC<{ row: SlateRow }> = ({ row }) => {
  const sp = candidateSpeakers.find((x) => x.id === row.speakerId)
  if (!sp) return null
  const personaLabel = row.persona === 'cto-ai' ? 'CTO+AI Lead' : row.persona === 'martech' ? 'MarTech' : 'DevRel'
  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'var(--s2-container-bg)',
        boxShadow: 'var(--emc-nav-card-shadow)',
        padding: 20
      }}
    >
      <Badge variant="negative" size="S">{`SLOT ${row.slot} · JUSTIFICATION`}</Badge>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <SpeakerAvatar initials={sp.avatar} color={sp.avatarBg} size={36} />
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{sp.name}</Text>
          <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{row.sessionTitle}</Text>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row k="Forecast probability" v={combinedScore(sp).toFixed(2)} />
        <Row k="Persona served" v={personaLabel} />
        <Row k="Sponsor objectives covered" v={row.sponsorsCovered.join(', ')} />
        <Row k="Speaker fee" v={`$${(sp.feeUsd / 1000).toFixed(0)}K`} />
        <Row k="Time slot" v={`${row.day} · ${row.time}`} />
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
        <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
          Binding constraints
        </Text>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 11, color: 'var(--spectrum-global-color-gray-800)' }}>
          <li>Persona-mix target ({row.persona}) at 25-50% range</li>
          <li>At least 1 session per sponsor objective</li>
          <li>No double-booking ({sp.name} unique to slot {row.slot})</li>
          <li>Total budget ≤ $850K</li>
        </ul>
      </div>
    </div>
  )
}

const Row: React.FC<{ k: string, v: string }> = ({ k, v }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>{k}</Text>
    <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--spectrum-global-color-gray-900)' }}>{v}</Text>
  </div>
)

export default Act2Optimize
