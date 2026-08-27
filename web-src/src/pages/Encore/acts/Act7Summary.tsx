/*
* <license header>
*/

import React from 'react'
import { Button, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { ActHeader } from '../ActHeader'

interface Act7SummaryProps {
  onNavigate: (actId: string) => void
}

type Accent = 'navy' | 'red' | 'mint' | 'steel'

const ACCENT_BG: Record<Accent, string> = {
  navy: 'var(--spectrum-global-color-blue-600)',
  red: 'var(--spectrum-global-color-red-600)',
  mint: 'var(--spectrum-global-color-green-600)',
  steel: 'var(--spectrum-global-color-gray-600)'
}

const STATS: Array<{ v: string, l: string, accent: Accent }> = [
  { v: '800+', l: 'candidates evaluated', accent: 'navy' },
  { v: '12', l: 'slots filled', accent: 'red' },
  { v: '11 min', l: 'cycle time (vs 80 hr)', accent: 'mint' },
  { v: '8%', l: 'forecast MAE', accent: 'steel' },
  { v: '12', l: 'audit-ready receipts', accent: 'navy' },
  { v: '9 of 10', l: 'organizers contributing', accent: 'red' },
  { v: '4 sec', l: 'substitution time', accent: 'mint' },
  { v: 'v2.5.0', l: 'next model (canary)', accent: 'steel' }
]

const NOVELTIES = [
  { id: 'NE1', t: 'Calibrated Engagement Forecast' },
  { id: 'NE2', t: 'Unified 4-Sided Property Graph' },
  { id: 'NE3', t: 'Federated Reputation w/ DP' },
  { id: 'NE5', t: 'Closed-Loop Autonomous Outreach' },
  { id: 'NE8', t: 'Selective-Disclosure Receipts' }
]

export const Act7Summary: React.FC<Act7SummaryProps> = ({ onNavigate }) => {
  return (
    <>
      <ActHeader
        num={7}
        title="Closed Loop Summary"
        subtitle="From 800 candidates to confirmed slate, audit receipts, federated learning, and a 4-second substitution — in 11 minutes."
      />

      <div className={style({ display: 'grid', gap: 16 })} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ borderRadius: 12, padding: 20, boxShadow: 'var(--emc-nav-card-shadow)', backgroundColor: ACCENT_BG[s.accent] }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 28, fontWeight: 700, color: 'white' }}>{s.v}</Text>
            <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>{s.l}</Text>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 24, borderRadius: 12, padding: 24,
          backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)'
        }}
      >
        <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
          5 patent-critical novelties demonstrated
        </Text>
        <div className={style({ display: 'grid', gap: 12, marginTop: 12 })} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {NOVELTIES.map((n) => (
            <div
              key={n.id}
              style={{ textAlign: 'center', borderRadius: 8, padding: 12, border: '2px solid var(--spectrum-global-color-red-600)' }}
            >
              <Text UNSAFE_style={{ display: 'block', fontSize: 18, fontWeight: 900, color: 'var(--spectrum-global-color-red-600)' }}>{n.id}</Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-800)', marginTop: 4 }}>{n.t}</Text>
            </div>
          ))}
        </div>
        <Text UNSAFE_style={{ display: 'block', fontSize: 12, fontStyle: 'italic', color: 'var(--spectrum-global-color-gray-600)', marginTop: 16 }}>
          22 additional dependent claims available for Q&amp;A: anti-prompt-injection, right-to-explanation,
          air-gapped operation, accessibility pathway, cross-border re-policy, multi-day re-confirmation,
          per-modality consent, tamper-evident hardware, and more.
        </Text>
      </div>

      <div className={style({ display: 'grid', gap: 20, marginTop: 24 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div style={{ borderRadius: 12, padding: 24, backgroundColor: 'var(--spectrum-global-color-blue-600)', boxShadow: 'var(--emc-nav-card-shadow)' }}>
          <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'white' }}>The Ask</Text>
          <ol className={style({ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, paddingStart: 0 })} style={{ listStyle: 'none' }}>
            {[
              'Patent filing approval — US non-provisional within 60 days.',
              'Pilot allocation — one Adobe-owned event (Summit, MAX, or Symposium) for v1.',
              'Cross-org NDA conversations to validate federation at TRL 6.',
              'Inventor team continuity through pilot completion.'
            ].map((item, i) => (
              <li key={i} className={style({ display: 'flex', gap: 12, alignItems: 'start' })}>
                <span
                  style={{
                    width: 24, height: 24, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white', backgroundColor: 'var(--spectrum-global-color-red-600)'
                  }}
                >
                  {i + 1}
                </span>
                <Text UNSAFE_style={{ fontSize: 14, color: 'white' }}>{item}</Text>
              </li>
            ))}
          </ol>
        </div>

        <div
          style={{
            borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)'
          }}
        >
          <div>
            <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
              Why Now
            </Text>
            <ul className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingStart: 20 })}>
              {[
                'EU AI Act transparency provisions take effect this August.',
                'Regulated buyers already blocking opaque AI from procurement.',
                'Foundation-model maturity makes voice-similar drafting commercially viable now.',
                'Competitor consolidation window is open; establish the architectural standard first.'
              ].map((item, i) => (
                <li key={i}>
                  <Text UNSAFE_style={{ fontSize: 14, color: 'var(--spectrum-global-color-gray-800)' }}>{item}</Text>
                </li>
              ))}
            </ul>
          </div>
          <div
            className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12 })}
            style={{ borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}
          >
            <Button variant="secondary" fillStyle="outline" onPress={() => onNavigate('act0')}>↻ Restart demo</Button>
            <Button variant="primary" onPress={() => onNavigate('act8')}>Q&amp;A deep dives →</Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Act7Summary
