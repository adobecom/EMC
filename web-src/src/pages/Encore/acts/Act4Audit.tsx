/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, Button, Checkbox, StatusLight, Text } from '@react-spectrum/s2'
import BadgeVerified from '@react-spectrum/s2/icons/BadgeVerified'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import { sampleReceipt, auditTimeline } from '../data/receipts'

interface Act4AuditProps {
  onNavigate: (actId: string) => void
}

interface RevealRow {
  key: string
  label: string
  value: string
}

const REVEAL_ROWS: RevealRow[] = [
  { key: 'subject.speaker_id', label: 'subject.speaker_id', value: sampleReceipt.subject.speakerId },
  { key: 'subject.event_id', label: 'subject.event_id', value: sampleReceipt.subject.eventId },
  { key: 'subject.slot', label: 'subject.slot', value: String(sampleReceipt.subject.slot) },
  { key: 'recommendation.forecast_probability', label: 'recommendation.forecast_probability', value: String(sampleReceipt.recommendation.forecastProbability) },
  { key: 'recommendation.confidence_interval', label: 'recommendation.confidence_interval', value: `[${sampleReceipt.recommendation.confidenceInterval.join(', ')}]` },
  { key: 'recommendation.model_id', label: 'recommendation.model_id', value: sampleReceipt.recommendation.modelId },
  { key: 'recommendation.policy_version', label: 'recommendation.policy_version', value: sampleReceipt.recommendation.policyVersion },
  { key: 'contributing_features', label: 'contributing_features', value: `${sampleReceipt.contributingFeatures.length} features (toggle to reveal)` }
]

const DEFAULT_REVEALS: Record<string, boolean> = {
  'subject.speaker_id': true,
  'subject.event_id': true,
  'subject.slot': true,
  'recommendation.forecast_probability': true,
  'recommendation.confidence_interval': true,
  'recommendation.model_id': true,
  'recommendation.policy_version': true,
  contributing_features: false
}

export const Act4Audit: React.FC<Act4AuditProps> = ({ onNavigate }) => {
  const [reveals, setReveals] = useState<Record<string, boolean>>(DEFAULT_REVEALS)
  const [verified, setVerified] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <ActHeader
          num={4}
          title="Auditor View — Verifiable Recommendation Receipts"
          subtitle="EU AI Act Articles 13/14 transparency + GDPR Article 22 explanations + BBS+ selective disclosure."
          patent="NE8"
        />
        <Badge variant="neutral" size="M">AUDITOR MODE</Badge>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2', borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                {sampleReceipt.receiptId}
              </Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>
                Recommendation: Slot {sampleReceipt.subject.slot} · {sampleReceipt.subject.speakerName}
              </Text>
            </div>
            <Badge variant="positive" size="S">signed JSON-LD VC</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
            <Kv k="@context" v="https://www.w3.org/2018/credentials/v1" />
            <Kv k="type" v="VerifiableCredential, EncoreRecommendation" />
            <Kv k="issuer" v={sampleReceipt.issuer} />
            <Kv k="issued_at" v={sampleReceipt.issuedAt} />
          </div>

          <div style={{ marginTop: 16 }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 8 }}>
              Selective-disclosure reveal (BBS+-2023)
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REVEAL_ROWS.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--spectrum-global-color-gray-200)', paddingBottom: 6
                  }}
                >
                  <Checkbox
                    aria-label={`Reveal ${row.label}`}
                    isSelected={reveals[row.key] || false}
                    onChange={(checked) => setReveals((r) => ({ ...r, [row.key]: checked }))}
                  />
                  <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--spectrum-global-color-gray-600)', width: 320 }}>
                    {row.label}
                  </Text>
                  <Text
                    UNSAFE_style={{
                      fontFamily: 'monospace', fontSize: 12,
                      color: reveals[row.key] ? 'var(--spectrum-global-color-gray-900)' : 'var(--spectrum-global-color-gray-500)',
                      filter: reveals[row.key] ? 'none' : 'blur(4px)',
                      userSelect: reveals[row.key] ? 'auto' : 'none'
                    }}
                  >
                    {reveals[row.key] ? row.value : '••••••••••'}
                  </Text>
                </div>
              ))}
            </div>
            {reveals.contributing_features && (
              <div style={{ marginTop: 8, backgroundColor: 'var(--spectrum-global-color-gray-75)', borderRadius: 6, padding: 8 }}>
                {sampleReceipt.contributingFeatures.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-800)' }}>{c.feature}</Text>
                    <Text UNSAFE_style={{ fontFamily: 'monospace', color: 'var(--spectrum-global-color-gray-600)' }}>{(c.weight * 100).toFixed(0)}%</Text>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 8 }}>
              Provenance & hash chain
            </Text>
            <div
              style={{
                backgroundColor: 'var(--spectrum-global-color-gray-75)', borderRadius: 6, padding: 8,
                fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', wordBreak: 'break-all'
              }}
            >
              <div>merkle_root: {sampleReceipt.provenance.merkleRoot}</div>
              <div>anchored_at: {sampleReceipt.provenance.anchoredAt} ({sampleReceipt.provenance.anchorChain})</div>
              <div>hsm_signature: {sampleReceipt.provenance.hsmSignature}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {verified ? (
                <StatusLight variant="positive">Proof verified against Merkle root</StatusLight>
              ) : (
                <Button variant="primary" onPress={() => setVerified(true)}>
                  <Text>Verify selective-disclosure proof</Text>
                </Button>
              )}
            </div>
          </div>

          {verified && (
            <PatentBadge label="NE8 PATENT MOMENT — selective disclosure" accent="red">
              The auditor verifies <i>this</i> recommendation against the published Merkle root,
              revealing only the fields toggled above. No other candidates, no other receipts, are
              visible in the auditor view. That isolation is what passes EU AI Act review.
            </PatentBadge>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
            {sampleReceipt.governanceBadges.map((b) => (
              <Badge key={b} variant="positive" size="S">
                <BadgeVerified />
                {b}
              </Badge>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', boxShadow: 'var(--emc-nav-card-shadow)', padding: 20 }}>
          <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Hash-chained audit log
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {auditTimeline.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', width: 56, flexShrink: 0 }}>
                  {e.time}
                </Text>
                <div style={{ flex: 1 }}>
                  <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'var(--spectrum-global-color-gray-900)' }}>{e.event}</Text>
                  <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>{e.receiptId}</Text>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--spectrum-global-color-green-600)', marginTop: 4 }} />
              </div>
            ))}
          </div>

          <Text UNSAFE_style={{ display: 'block', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--spectrum-global-color-gray-200)' }}>
            Hash chain anchored every hour to <span style={{ fontFamily: 'monospace' }}>opentimestamps-bitcoin</span>. Tampering at any step breaks the chain.
          </Text>

          <div style={{ marginTop: 16 }}>
            <Button variant="accent" onPress={() => onNavigate('act5')}>
              <Text>Federation round 47 →</Text>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Kv: React.FC<{ k: string, v: string }> = ({ k, v }) => (
  <div style={{ backgroundColor: 'var(--spectrum-global-color-gray-75)', borderRadius: 6, padding: 8 }}>
    <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>{k}</Text>
    <Text UNSAFE_style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Text>
  </div>
)

export default Act4Audit
