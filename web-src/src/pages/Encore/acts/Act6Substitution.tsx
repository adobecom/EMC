/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, Button, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { DemoProgressBar } from '../DemoProgressBar'
import { SpeakerAvatar } from '../SpeakerAvatar'
import { cancellation, driftStatus, substituteCandidates } from '../data/substitutes'
import { candidateSpeakers } from '../data/speakers'
import type { SubstituteCandidate } from '../types'

interface Act6SubstitutionProps {
  onNavigate: (actId: string) => void
}

type Phase = 'idle' | 'running' | 'done' | 'selected'

export const Act6Substitution: React.FC<Act6SubstitutionProps> = ({ onNavigate }) => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [picked, setPicked] = useState<SubstituteCandidate | null>(null)

  return (
    <>
      <ActHeader
        num={6}
        title="Real-Time Substitution & Drift Detection"
        subtitle="Engagement-preserving backup optimization on cancellation; continuous Brier-score drift monitoring."
        patent="NE11 + NE12"
      />

      <div className={style({ display: 'grid', gap: 20 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })} style={{ gridColumn: 'span 2' }}>
          <div
            style={{
              borderRadius: 12,
              backgroundColor: 'var(--s2-container-bg)',
              boxShadow: 'var(--emc-nav-card-shadow)',
              padding: 20
            }}
          >
            <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <div>
                <div className={style({ display: 'flex', alignItems: 'center', gap: 4 })}>
                  <AlertTriangle />
                  <Text UNSAFE_style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-red-600)' }}>
                    Cancellation · T-{cancellation.timeToEventHours}h to event
                  </Text>
                </div>
                <Text UNSAFE_style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>
                  {cancellation.cancelledName} cancelled — Slot {cancellation.cancelledSlot}
                </Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>{cancellation.cancelledSession}</Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontStyle: 'italic', color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>
                  Reason: {cancellation.reason}
                </Text>
              </div>
              {phase === 'idle' && (
                <Button variant="accent" onPress={() => setPhase('running')}>
                  Run substitution engine →
                </Button>
              )}
            </div>
          </div>

          {phase === 'running' && (
            <DemoProgressBar label="Re-ranking candidate pool against fixed slot constraints…" durationMs={3800} onDone={() => setPhase('done')} />
          )}

          {(phase === 'done' || phase === 'selected') && (
            <>
              <PatentBadge label="NE11 PATENT MOMENT — engagement-preserving backup" accent="red">
                Three substitutes ranked in 4 seconds with explicit engagement, sponsor, and persona deltas
                vs. the cancelled speaker. Click a card to send the elevated-priority invitation.
              </PatentBadge>

              <div className={style({ display: 'grid', gap: 12 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {substituteCandidates.map((sub, i) => {
                  const sp = candidateSpeakers.find((x) => x.id === sub.speakerId)
                  const isPicked = picked?.speakerId === sub.speakerId
                  return (
                    <button
                      key={sub.speakerId}
                      type="button"
                      onClick={() => {
                        setPicked(sub)
                        setPhase('selected')
                      }}
                      style={{
                        textAlign: 'left',
                        padding: 16,
                        borderRadius: 12,
                        cursor: 'pointer',
                        backgroundColor: 'var(--s2-container-bg)',
                        border: `2px solid ${isPicked ? 'var(--spectrum-global-color-green-600)' : i === 0 ? 'var(--spectrum-global-color-red-600)' : 'var(--spectrum-global-color-gray-300)'}`
                      }}
                    >
                      <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                        <SpeakerAvatar initials={sp?.avatar ?? ''} color={sp?.avatarBg} size={36} />
                        {i === 0 && <Badge variant="negative" size="S">TOP CHOICE</Badge>}
                      </div>
                      <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 8 }}>
                        {sub.name}
                      </Text>
                      <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{sub.headline}</Text>
                      <div className={style({ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 })}>
                        <DeltaRow label="Engagement" value={sub.deltaEngagement} />
                        <DeltaRow label="Sponsor coverage" value={sub.deltaSponsor} />
                        <DeltaRow label="Persona match" value={sub.deltaPersona} />
                      </div>
                      <Text
                        UNSAFE_style={{
                          display: 'block', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)',
                          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--spectrum-global-color-gray-200)'
                        }}
                      >
                        {sub.availability}
                      </Text>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {phase === 'selected' && picked && (
            <div
              style={{
                borderRadius: 12, padding: 16,
                backgroundColor: 'var(--spectrum-global-color-green-100)',
                border: '1px solid var(--spectrum-global-color-green-600)'
              }}
            >
              <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-green-700)' }}>
                ✓ Elevated-priority invitation sent to {picked.name}
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-800)', marginTop: 4 }}>
                HMAC-signed URL delivered via highest-propensity channel · expected acceptance window: 9 hours.
              </Text>
              <Button variant="accent" styles={style({ marginTop: 12 })} onPress={() => onNavigate('act7')}>
                Show summary →
              </Button>
            </div>
          )}
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
            <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
              Calibration Drift Monitor
            </Text>
            <div className={style({ display: 'grid', gap: 8, marginTop: 12 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <Stat label="Current Brier" value={String(driftStatus.currentBrier)} />
              <Stat label="Baseline" value={String(driftStatus.baselineBrier)} />
              <Stat label="Trend" value={driftStatus.trend} />
              <Stat label="Threshold" value={String(driftStatus.driftThreshold)} />
            </div>

            <div style={{ marginTop: 16, borderRadius: 8, padding: 12, backgroundColor: 'var(--spectrum-global-color-yellow-100)' }}>
              <Text UNSAFE_style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-900)' }}>
                Auto-retrain queued
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-800)', marginTop: 4 }}>
                Canary <span style={{ fontFamily: 'monospace' }}>{driftStatus.canaryRoundId}</span> shadow-deployed.
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>
                Promotion ETA: {driftStatus.promotionEta}
              </Text>
            </div>

            <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 })}>
              <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>Current model</Text>
              <Badge variant="informative" size="S">{driftStatus.modelVersionCurrent}</Badge>
            </div>
            <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 })}>
              <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>Candidate</Text>
              <Badge variant="positive" size="S">{driftStatus.modelVersionCandidate}</Badge>
            </div>
          </div>

          <PatentBadge label="NE12 PATENT MOMENT" accent="navy">
            Brier-score drift detected (0.11 → 0.13), Hosmer-Lemeshow goodness-of-fit failing.
            Retraining auto-queued; canary deployment scheduled against a held-out shadow event cohort.
            Never silently swaps the production model.
          </PatentBadge>
        </div>
      </div>
    </>
  )
}

const DeltaRow: React.FC<{ label: string, value: number }> = ({ label, value }) => {
  const sign = value > 0 ? '+' : ''
  const color = value < 0 ? 'var(--spectrum-global-color-red-600)' : value > 0 ? 'var(--spectrum-global-color-green-600)' : 'var(--spectrum-global-color-gray-600)'
  return (
    <div className={style({ display: 'flex', justifyContent: 'space-between' })}>
      <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{label}</Text>
      <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color }}>{sign}{value.toFixed(2)}</Text>
    </div>
  )
}

const Stat: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ borderRadius: 6, padding: 8, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
    <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
      {label}
    </Text>
    <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{value}</Text>
  </div>
)

export default Act6Substitution
