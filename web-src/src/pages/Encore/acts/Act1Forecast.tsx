/*
* <license header>
*/

import React, { useEffect, useState } from 'react'
import { Badge, Button, Tab, TabList, TabPanel, Tabs, Text } from '@react-spectrum/s2'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { DemoProgressBar } from '../DemoProgressBar'
import { SpeakerAvatar } from '../SpeakerAvatar'
import { GraphViz } from '../GraphViz'
import { candidateSpeakers, combinedScore } from '../data/speakers'
import type { AudienceId, AudienceScore, CandidateSpeaker } from '../types'

type Phase = 'loading' | 'graph' | 'scoring' | 'ready'
type AudienceKey = AudienceId | 'combined'

const AUDIENCE_TABS: Array<{ id: AudienceKey, label: string }> = [
  { id: 'combined', label: 'Combined (target audience)' },
  { id: 'cto-ai', label: 'CTO+AI Lead only' },
  { id: 'martech', label: 'Marketing-Ops only' },
  { id: 'devrel', label: 'Developer only' }
]

const scoreAccent = (p: number): string => {
  if (p >= 0.82) return 'var(--spectrum-global-color-red-600)'
  if (p >= 0.72) return 'var(--spectrum-global-color-blue-600)'
  return 'var(--emc-encore-persona)'
}

export const Act1Forecast: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('loading')
  const [streamCount, setStreamCount] = useState(0)
  const [highlightComm, setHighlightComm] = useState<string | null>(null)
  const [activeAudience, setActiveAudience] = useState<AudienceKey>('combined')
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    if (phase !== 'scoring') return
    const total = candidateSpeakers.length
    let i = 0
    const t = setInterval(() => {
      i += 1
      setStreamCount(i)
      if (i >= total) {
        clearInterval(t)
        setPhase('ready')
      }
    }, 220)
    return () => clearInterval(t)
  }, [phase])

  const sortedCandidates = [...candidateSpeakers].sort((a, b) => combinedScore(b) - combinedScore(a))

  const scoreFor = (s: CandidateSpeaker): AudienceScore => {
    if (activeAudience === 'combined') {
      const p = combinedScore(s)
      return { p, lo: p - 0.04, hi: p + 0.04 }
    }
    return s.scoresByAudience[activeAudience]
  }

  return (
    <>
      <ActHeader
        num={1}
        title="Build Unified Graph & Score Candidates"
        subtitle="Layer 2 builds the 4-sided property graph; Layer 3 returns calibrated audience-conditioned probabilities."
        patent="NE1 + NE2"
      />

      {phase === 'loading' && (
        <DemoProgressBar
          label="Building unified graph + running Leiden community detection…"
          durationMs={3200}
          onDone={() => setPhase('graph')}
        />
      )}

      {(phase === 'graph' || phase === 'scoring' || phase === 'ready') && (
        <>
          <GraphViz
            highlightCommunity={highlightComm}
            onToggleCommunity={(id) => setHighlightComm(highlightComm === id ? null : id)}
          />

          <PatentBadge label="NE2 PATENT MOMENT" accent="red">
            Four node types — speakers, topics, sponsors, attendee persona clusters — live in one graph.
            Leiden community detection runs across all four simultaneously and surfaces communities that are
            speaker-coherent <i>and</i> audience-coherent <i>and</i> sponsor-coherent. Click a community below
            to highlight it.
          </PatentBadge>

          {phase === 'graph' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <Button variant="accent" onPress={() => setPhase('scoring')}>
                <Text>Score all 800+ candidates →</Text>
              </Button>
            </div>
          )}
        </>
      )}

      {(phase === 'scoring' || phase === 'ready') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 16 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div
              style={{
                borderRadius: 12,
                backgroundColor: 'var(--s2-container-bg)',
                boxShadow: 'var(--emc-nav-card-shadow)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--spectrum-global-color-gray-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text UNSAFE_style={{ fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)' }}>
                  Calibrated Engagement Scores
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge variant="informative" size="S">model v2.4.1</Badge>
                  <Badge variant="positive" size="S">Brier 0.11</Badge>
                  <Badge variant="neutral" size="S">isotonic post-cal</Badge>
                </div>
              </div>

              <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--spectrum-global-color-gray-200)' }}>
                <Tabs
                  aria-label="Score conditioned on"
                  density="compact"
                  selectedKey={activeAudience}
                  onSelectionChange={(key) => setActiveAudience(key as AudienceKey)}
                >
                  <TabList>
                    {AUDIENCE_TABS.map((a) => (
                      <Tab key={a.id} id={a.id}>{a.label}</Tab>
                    ))}
                  </TabList>
                  {AUDIENCE_TABS.map((a) => (
                    <TabPanel key={a.id} id={a.id}>{null}</TabPanel>
                  ))}
                </Tabs>
              </div>

              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {sortedCandidates.slice(0, streamCount).map((s) => {
                  const sc = scoreFor(s)
                  const accent = scoreAccent(sc.p)
                  return (
                    <div
                      key={s.id}
                      onMouseEnter={() => setHovered(s.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 20px',
                        borderTop: '1px solid var(--spectrum-global-color-gray-200)',
                        backgroundColor: hovered === s.id ? 'var(--spectrum-global-color-blue-100)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <SpeakerAvatar initials={s.avatar} color={s.avatarBg} size={32} />
                      <div style={{ minWidth: 180 }}>
                        <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-900)' }}>
                          {s.name}
                        </Text>
                        <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{s.headline}</Text>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: accent }}>
                            {sc.p.toFixed(2)}
                          </Text>
                          <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                            CI [{sc.lo.toFixed(2)} - {sc.hi.toFixed(2)}]
                          </Text>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--spectrum-global-color-gray-200)', marginTop: 6, position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute', top: 0, height: 6, borderRadius: 3,
                              left: `${sc.lo * 100}%`, width: `${(sc.hi - sc.lo) * 100}%`, backgroundColor: accent
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute', top: -2, width: 2, height: 10,
                              left: `calc(${sc.p * 100}% - 1px)`, backgroundColor: 'var(--spectrum-global-color-blue-600)'
                            }}
                          />
                        </div>
                      </div>
                      <Badge variant="neutral" size="S">{s.community.split(' + ')[0]}</Badge>
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  padding: '8px 20px',
                  borderTop: '1px solid var(--spectrum-global-color-gray-200)',
                  backgroundColor: 'var(--spectrum-global-color-gray-75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                  {streamCount} of {candidateSpeakers.length} candidates scored (plus 788 background)
                </Text>
                <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                  Tier 1: 78 ms · Tier 2 GNN: 4.2 s
                </Text>
              </div>
            </div>
          </div>

          <div>
            {hovered ? (
              <SpeakerDetail s={candidateSpeakers.find((x) => x.id === hovered) as CandidateSpeaker} />
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  backgroundColor: 'var(--s2-container-bg)',
                  boxShadow: 'var(--emc-nav-card-shadow)',
                  padding: 20
                }}
              >
                <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--spectrum-global-color-gray-600)' }}>
                  Hover a candidate
                </Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
                  Hover Dr. Sarah Chen. Then toggle the audience above to see her score change.
                  Same speaker, different audience: that&apos;s the calibrated probability working.
                </Text>
                <PatentBadge label="NE1 PATENT MOMENT" accent="red">
                  Calibrated probability + audience conditioning + isotonic post-calibration validated
                  by Brier score, with cross-organizer consistency preserved through federated Bayesian
                  consensus calibration.
                </PatentBadge>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const AUDIENCES: Array<{ id: AudienceId, label: string }> = [
  { id: 'cto-ai', label: 'CTO + AI Lead' },
  { id: 'martech', label: 'Marketing-Ops' },
  { id: 'devrel', label: 'Developer' }
]

const SpeakerDetail: React.FC<{ s: CandidateSpeaker }> = ({ s }) => {
  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'var(--s2-container-bg)',
        boxShadow: 'var(--emc-nav-card-shadow)',
        padding: 20
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SpeakerAvatar initials={s.avatar} color={s.avatarBg} size={48} />
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>
            {s.name}
          </Text>
          <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{s.affiliation}</Text>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 8 }}>
          Audience-conditioned scores
        </Text>
        {AUDIENCES.map((a) => {
          const v = s.scoresByAudience[a.id]
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)', width: 112 }}>{a.label}</Text>
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--spectrum-global-color-gray-900)', width: 48 }}>
                {v.p.toFixed(2)}
              </Text>
              <div style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'var(--spectrum-global-color-gray-200)', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute', height: 6, borderRadius: 3,
                    left: `${v.lo * 100}%`, width: `${(v.hi - v.lo) * 100}%`,
                    backgroundColor: 'var(--spectrum-global-color-blue-600)'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {s.contributing && (
        <div style={{ marginTop: 16 }}>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 6 }}>
            Top contributing features
          </Text>
          {s.contributing.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text UNSAFE_style={{ flex: 1, fontSize: 11, color: 'var(--spectrum-global-color-gray-800)' }}>{c.feature}</Text>
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                {(c.weight * 100).toFixed(0)}%
              </Text>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Act1Forecast
