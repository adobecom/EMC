/*
* <license header>
*/

import React, { useEffect, useState } from 'react'
import { Badge, Button, StatusLight, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { FederationRing } from '../FederationRing'
import { brierTrajectory, roundSummary } from '../data/federation'
import type { BrierPoint } from '../types'

interface Act5FederationProps {
  onNavigate: (actId: string) => void
}

export const Act5Federation: React.FC<Act5FederationProps> = ({ onNavigate }) => {
  const [contributing, setContributing] = useState(false)
  const [aggregated, setAggregated] = useState(false)
  const [showOutlier, setShowOutlier] = useState(false)

  useEffect(() => {
    if (!contributing) return
    const t1 = setTimeout(() => setShowOutlier(true), 2400)
    const t2 = setTimeout(() => setAggregated(true), 3800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [contributing])

  return (
    <>
      <ActHeader
        num={5}
        title="Federated Cross-Organizer Reputation"
        subtitle="Secure aggregation + per-organizer differential privacy + Byzantine-robust meta-detector."
        patent="NE3 + NE19"
      />

      <div className={style({ display: 'grid', gap: 20 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <div
            style={{
              borderRadius: 12,
              backgroundColor: 'var(--s2-container-bg)',
              boxShadow: 'var(--emc-nav-card-shadow)',
              padding: 20
            }}
          >
            <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 })}>
              <Text UNSAFE_style={{ fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)' }}>
                Federated Network · Round {roundSummary.roundId}
              </Text>
              <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                {roundSummary.contributingOrganizers} contributing · {roundSummary.excludedOrganizers.length} excluded
              </Text>
            </div>

            <FederationRing contributing={contributing} aggregated={aggregated} showOutlier={showOutlier} />

            <div className={style({ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 })}>
              {!contributing ? (
                <Button variant="accent" onPress={() => setContributing(true)}>
                  Contribute round {roundSummary.roundId} →
                </Button>
              ) : (
                <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
                  {!aggregated ? 'Aggregating noised gradient shares...' : '✓ Round complete'}
                </Text>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <BrierMini data={brierTrajectory} />
              </div>
            </div>
          </div>
        </div>

        <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
          <div
            style={{
              borderRadius: 12,
              backgroundColor: 'var(--s2-container-bg)',
              boxShadow: 'var(--emc-nav-card-shadow)',
              padding: 16
            }}
          >
            <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
              Meta-Detector
            </Text>
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 })}>
              <DetectorRow label="Reputation scoring" status="PASS" variant="positive" />
              <DetectorRow
                label="Gradient outlier"
                status={showOutlier ? 'AMBER: Org-G 4.2σ' : 'monitoring…'}
                variant={showOutlier ? 'notice' : 'neutral'}
              />
              <DetectorRow label="Byzantine-robust (Krum)" status="PASS" variant="positive" />
              <DetectorRow label="Challenge round" status="9/10 robust" variant="positive" />
            </div>
          </div>

          {showOutlier && (
            <PatentBadge label="NE19 PATENT MOMENT — multi-layer poisoning defense" accent="red">
              Org-G&apos;s gradient deviates 4.2σ from the contribution distribution. Auto-excluded.
              Their reputation score is decremented. The remaining 9 organizers complete the round.
            </PatentBadge>
          )}

          {aggregated && (
            <div
              style={{
                borderRadius: 12,
                backgroundColor: 'var(--s2-container-bg)',
                boxShadow: 'var(--emc-nav-card-shadow)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <Badge variant="positive" size="S">Rare pattern surfaced</Badge>
              <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{roundSummary.rarePatternSurfaced}</Text>
            </div>
          )}

          {aggregated && (
            <Button variant="accent" styles={style({ width: 'full' })} onPress={() => onNavigate('act6')}>
              Real-time substitution drill →
            </Button>
          )}
        </div>
      </div>

      <PatentBadge label="NE3 PATENT MOMENT" accent="red">
        Per-organizer differential-privacy noise (each organizer chooses their own ε), secure aggregation
        so the aggregator never sees individual gradients, calibration-preserved Bayesian consensus
        across organizers. Network-scale learning without exposing audience or sponsor data.
      </PatentBadge>
    </>
  )
}

const DetectorRow: React.FC<{ label: string, status: string, variant: 'positive' | 'notice' | 'neutral' }> = ({ label, status, variant }) => (
  <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
    <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{label}</Text>
    <StatusLight variant={variant} size="S">{status}</StatusLight>
  </div>
)

const BrierMini: React.FC<{ data: BrierPoint[] }> = ({ data }) => {
  const w = 180
  const h = 36
  const min = 0.10
  const max = 0.20
  const norm = (v: number): number => h - ((v - min) / (max - min)) * h
  const stepX = w / (data.length - 1)
  const points = data.map((d, i) => `${i * stepX},${norm(d.brier)}`).join(' ')
  const last = data[data.length - 1]
  return (
    <div style={{ borderRadius: 8, backgroundColor: 'var(--spectrum-global-color-gray-75)', padding: 8 }}>
      <Text UNSAFE_style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
        Global Brier (rounds 40-47)
      </Text>
      <svg width={w} height={h} style={{ marginTop: 4, display: 'block' }}>
        <polyline points={points} fill="none" stroke="var(--spectrum-global-color-blue-600)" strokeWidth={1.5} />
        <circle cx={(data.length - 1) * stepX} cy={norm(last.brier)} r={3} fill="var(--spectrum-global-color-red-600)" />
      </svg>
      <Text UNSAFE_style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-800)', textAlign: 'right' }}>
        ↓ {last.brier}
      </Text>
    </div>
  )
}

export default Act5Federation
