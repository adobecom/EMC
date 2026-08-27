/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, Button, Text } from '@react-spectrum/s2'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { SpeakerAvatar } from '../SpeakerAvatar'
import { voiceCorpusSarahChen, voiceSimilarDraft, genericDraft, invitationMeta } from '../data/voiceCorpus'
import { candidateSpeakers } from '../data/speakers'
import type { Draft } from '../types'

type Step = 'draft' | 'invite' | 'counter' | 'accepted'

interface Act3OutreachProps {
  onNavigate: (actId: string) => void
}

export const Act3Outreach: React.FC<Act3OutreachProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<Step>('draft')
  const sarah = candidateSpeakers.find((s) => s.id === 'spk-001')
  if (!sarah) return null

  return (
    <>
      <ActHeader
        num={3}
        title="Voice-Similar Drafting & Autonomous Outreach"
        subtitle="Foundation-model abstract drafting gated by voice-similarity; HMAC-signed invitations with calendar-aware negotiation."
        patent="NE5 + NE7"
      />

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
          <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Voice Corpus
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <SpeakerAvatar initials={sarah.avatar} color={sarah.avatarBg} size={44} />
            <div>
              <Text UNSAFE_style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{sarah.name}</Text>
              <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{sarah.affiliation}</Text>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16, textAlign: 'center' }}>
            <StatTile n={voiceCorpusSarahChen.talks} k="Talks" />
            <StatTile n={voiceCorpusSarahChen.articles} k="Articles" />
            <StatTile n={voiceCorpusSarahChen.posts} k="Posts" />
          </div>

          <div style={{ marginTop: 16 }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 6 }}>
              Voice markers
            </Text>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--spectrum-global-color-gray-800)' }}>
              {voiceCorpusSarahChen.voiceMarkers.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 16 }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 6 }}>
              Recent public talks
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {voiceCorpusSarahChen.recentTalks.map((t, i) => (
                <div key={i} style={{ fontSize: 11 }}>
                  <Text UNSAFE_style={{ display: 'block', fontWeight: 600, color: 'var(--spectrum-global-color-gray-900)' }}>{t.title}</Text>
                  <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{t.venue} · {t.durationMin} min</Text>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 4 }}>
              Embedding (10-d preview)
            </Text>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
              {voiceCorpusSarahChen.embeddingDistributionPreview.map((d) => (
                <div
                  key={d.dim}
                  title={`dim ${d.dim}: ${d.value}`}
                  style={{
                    flex: 1,
                    borderRadius: 2,
                    height: `${Math.abs(d.value) * 100 + 8}%`,
                    backgroundColor: d.value >= 0 ? 'var(--spectrum-global-color-blue-600)' : 'var(--spectrum-global-color-red-600)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PatentBadge label="NE7 PATENT MOMENT — voice-similarity gating" accent="red">
            Side-by-side: a generic LLM draft (similarity 0.42 — REJECTED by the gate) vs. a voice-similar
            draft (similarity 0.87 — PASSED). The speaker only ever sees passing drafts. Speakers may opt
            out of voice-similar drafting at any time.
          </PatentBadge>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <DraftCard title="Generic LLM draft" draft={genericDraft} />
            <DraftCard title="Voice-similar draft" draft={voiceSimilarDraft} />
          </div>

          {step === 'draft' && (
            <Button variant="accent" onPress={() => setStep('invite')}>
              <Text>Send signed invitation →</Text>
            </Button>
          )}

          {(step === 'invite' || step === 'counter' || step === 'accepted') && (
            <InvitationCard step={step} setStep={setStep} />
          )}

          {step === 'accepted' && (
            <div
              style={{
                borderRadius: 8,
                padding: 16,
                backgroundColor: 'var(--spectrum-global-color-green-100)',
                border: '1px solid var(--spectrum-global-color-green-600)'
              }}
            >
              <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-green-700)' }}>
                ✓ Invitation accepted with revised slot
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-800)', marginTop: 4 }}>
                Speaker confirmed Tue 10:30 AM (counter-proposal honored). Outreach outcome logged to
                Layer 3 as labeled training data.
              </Text>
              <div style={{ marginTop: 12 }}>
                <Button variant="accent" onPress={() => onNavigate('act4')}>
                  <Text>Show audit receipts →</Text>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const StatTile: React.FC<{ n: number, k: string }> = ({ n, k }) => (
  <div style={{ backgroundColor: 'var(--spectrum-global-color-gray-75)', borderRadius: 8, padding: 8 }}>
    <Text UNSAFE_style={{ display: 'block', fontSize: 20, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{n}</Text>
    <Text UNSAFE_style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>{k}</Text>
  </div>
)

const DraftCard: React.FC<{ title: string, draft: Draft }> = ({ title, draft }) => {
  const isPass = draft.pass
  return (
    <div
      style={{
        borderRadius: 12,
        boxShadow: 'var(--emc-nav-card-shadow)',
        padding: 16,
        border: `2px solid ${isPass ? 'var(--spectrum-global-color-green-600)' : 'var(--spectrum-global-color-red-600)'}`,
        backgroundColor: isPass ? 'var(--spectrum-global-color-green-100)' : 'var(--spectrum-global-color-gray-75)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
          {title}
        </Text>
        <Badge variant={isPass ? 'positive' : 'negative'} size="S">
          similarity {draft.similarity.toFixed(2)} · {isPass ? 'PASS' : 'FAIL'}
        </Badge>
      </div>
      <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-800)', lineHeight: 1.5, marginTop: 8 }}>
        {draft.text}
      </Text>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--spectrum-global-color-gray-300)'
        }}
      >
        <Text UNSAFE_style={{ fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>Threshold: {draft.threshold.toFixed(2)}</Text>
        <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>{draft.modelId}</Text>
      </div>
    </div>
  )
}

const InvitationCard: React.FC<{ step: Step, setStep: (s: Step) => void }> = ({ step, setStep }) => {
  return (
    <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text UNSAFE_style={{ fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>Signed Invitation</Text>
        <Badge variant="informative" size="S">HMAC · single-use · time-limited</Badge>
      </div>
      <Text
        UNSAFE_style={{
          display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 10,
          wordBreak: 'break-all', color: 'var(--spectrum-global-color-gray-600)',
          backgroundColor: 'var(--spectrum-global-color-gray-75)', borderRadius: 4, padding: 8
        }}
      >
        {invitationMeta.hmacUrl}
      </Text>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Channel selected
          </Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-900)' }}>{invitationMeta.channelSelected}</Text>
          <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>propensity {invitationMeta.channelPropensity}</Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', marginTop: 8 }}>
            Fallbacks: {invitationMeta.fallbackChannels.join(' · ')}
          </Text>
        </div>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Proposed slots
          </Text>
          {invitationMeta.proposedSlots.map((s) => (
            <Text key={s.iso} UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{s.label}</Text>
          ))}
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', marginTop: 8 }}>
            Reconciled against {invitationMeta.calendarEvidence.length} public calendar signals
          </Text>
        </div>
      </div>

      {step === 'invite' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onPress={() => setStep('counter')}>
            <Text>⏱ Speaker counter-proposes Tue 10:30</Text>
          </Button>
          <Button variant="primary" onPress={() => setStep('accepted')}>
            <Text>✓ Speaker accepts as-is</Text>
          </Button>
        </div>
      )}

      {step === 'counter' && (
        <PatentBadge label="NE5 PATENT MOMENT — closed-loop re-optimization" accent="red">
          Counter-proposal triggers Layer 4 re-optimization in 2 seconds. Conflicting slate slots automatically resolve;
          revised proposal sent back through the same signed URL.
          <div style={{ marginTop: 8 }}>
            <Button variant="accent" onPress={() => setStep('accepted')}>
              <Text>Send revised proposal → (auto-resolves)</Text>
            </Button>
          </div>
        </PatentBadge>
      )}
    </div>
  )
}

export default Act3Outreach
