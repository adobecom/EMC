/*
* <license header>
*/

import React, { useState } from 'react'
import { Badge, StatusLight, Tab, TabList, TabPanel, Tabs, Text } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import BadgeVerified from '@react-spectrum/s2/icons/BadgeVerified'
import { ActHeader } from '../ActHeader'
import { PatentBadge } from '../PatentBadge'
import {
  crossBorderRePolicy, didSpeakCredential, explanationVariants, failureModeTiers,
  policyValidatorRun, promptInjectionExamples, syntheticSubmission, trendTopics
} from '../data/deepDives'
import type { ExplanationAudience } from '../types'

const PANELS: Array<{ id: string, ne: string, title: string }> = [
  { id: 'trend', ne: 'NE4', title: 'Second-Derivative Trend Curation' },
  { id: 'synth', ne: 'NE9', title: 'Synthetic-Speaker Detection' },
  { id: 'policy', ne: 'NE13', title: 'LLM-Driven Policy Validator (Deploy-Time)' },
  { id: 'inject', ne: 'NE16', title: 'Anti-Prompt-Injection on Free Text' },
  { id: 'explain', ne: 'NE17', title: 'Right-to-Explanation Workflow' },
  { id: 'fail', ne: 'NE22', title: 'Failure-Mode Decision Hierarchy' },
  { id: 'attest', ne: 'NE23', title: 'Post-Event "Did Speak" Credential' },
  { id: 'cross', ne: 'NE21', title: 'Cross-Border Continuous Re-Policy' }
]

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  backgroundColor: 'var(--s2-container-bg)',
  boxShadow: 'var(--emc-nav-card-shadow)',
  padding: 24
}

export const Act8Extended: React.FC = () => {
  return (
    <>
      <ActHeader
        num={8}
        title="Extended Capabilities"
        subtitle="8 additional novel elements demonstrated as deep dives. Use these for Q&A or longer reviews."
        patent="NE4, NE9, NE13, NE16, NE17, NE21, NE22, NE23"
      />

      <Tabs aria-label="ENCORE deep dives" defaultSelectedKey="trend" density="compact">
        <TabList>
          {PANELS.map((p) => (
            <Tab key={p.id} id={p.id}>{`${p.ne} · ${p.title}`}</Tab>
          ))}
        </TabList>

        <TabPanel id="trend"><TrendPanel /></TabPanel>
        <TabPanel id="synth"><SyntheticPanel /></TabPanel>
        <TabPanel id="policy"><PolicyPanel /></TabPanel>
        <TabPanel id="inject"><InjectionPanel /></TabPanel>
        <TabPanel id="explain"><ExplanationPanel /></TabPanel>
        <TabPanel id="fail"><FailurePanel /></TabPanel>
        <TabPanel id="attest"><AttestationPanel /></TabPanel>
        <TabPanel id="cross"><CrossBorderPanel /></TabPanel>
      </Tabs>
    </>
  )
}

const PanelHeader: React.FC<{ ne: string, title: string }> = ({ ne, title }) => (
  <div
    className={style({ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 12 })}
    style={{ borderBottom: '1px solid var(--spectrum-global-color-gray-200)' }}
  >
    <Badge variant="negative" size="S">{ne}</Badge>
    <Text UNSAFE_style={{ fontSize: 20, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{title}</Text>
  </div>
)

function TrendPanel(): React.ReactElement {
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE4" title="Topics that will be hot at event date, not topics hot today" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        Layer 5 fuses public-signal volume from LinkedIn, X, podcast charts, and scholarly citations.
        LOESS smoothing yields first and second derivatives. Topics with positive second derivative
        (accelerating) at event-date forecast are surfaced; saturating topics are de-prioritized.
      </Text>

      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Topic</th>
            <th style={{ textAlign: 'right', padding: 8 }}>1st-derivative (now)</th>
            <th style={{ textAlign: 'right', padding: 8 }}>2nd-derivative</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Forecast at event date</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Classification</th>
          </tr>
        </thead>
        <tbody>
          {trendTopics.map((t) => (
            <tr
              key={t.topic}
              style={{
                borderTop: '1px solid var(--spectrum-global-color-gray-200)',
                backgroundColor: t.highlight ? 'var(--spectrum-global-color-green-100)' : undefined
              }}
            >
              <td style={{ padding: 8, fontWeight: 500, color: 'var(--spectrum-global-color-gray-800)' }}>{t.topic}</td>
              <td style={{ padding: 8, textAlign: 'right', fontFamily: 'monospace' }}>{t.d1 > 0 ? '+' : ''}{t.d1.toFixed(2)}</td>
              <td
                style={{
                  padding: 8, textAlign: 'right', fontFamily: 'monospace',
                  color: t.d2 > 0 ? 'var(--spectrum-global-color-green-700)' : 'var(--spectrum-global-color-red-600)'
                }}
              >
                {t.d2 > 0 ? '+' : ''}{t.d2.toFixed(2)}
              </td>
              <td style={{ padding: 8, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>
                {t.eventDateForecast.toFixed(2)}
              </td>
              <td style={{ padding: 8 }}>
                <Badge variant={t.classification === 'accelerating' ? 'positive' : t.classification === 'saturating' ? 'notice' : 'negative'} size="S">
                  {t.classification}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PatentBadge label="NE4 PATENT MOMENT" accent="red">
        Brandwatch, Talkwalker, and Sprinklr publish first-derivative trending topics —
        &quot;what is hot now&quot;. ENCORE computes the second derivative and forecasts volume at
        event date with confidence intervals. Programming committees get topics that will
        be hot when the event happens, not topics that have already peaked.
      </PatentBadge>
    </div>
  )
}

function SyntheticPanel(): React.ReactElement {
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE9" title="Generative-model fingerprinting on candidate submissions" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        New candidate submissions are scored by text (perplexity + latent signature) and image
        (frequency-domain artifacts) detectors before any outreach is sent. Suspected synthetic
        candidates route to organizer review.
      </Text>

      <div className={style({ display: 'grid', gap: 20, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div style={{ borderRadius: 8, padding: 16, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Candidate submission
          </Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>
            {syntheticSubmission.candidateName}
          </Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 12, fontStyle: 'italic', color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
            &quot;{syntheticSubmission.bio}&quot;
          </Text>
        </div>
        <div
          style={{
            borderRadius: 8, padding: 16,
            backgroundColor: 'var(--spectrum-global-color-gray-75)'
          }}
        >
          <Badge variant="negative" size="S">Detector output</Badge>
          <div className={style({ display: 'grid', gap: 8, marginTop: 8 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <Mini label="Text" value={syntheticSubmission.textProb.toFixed(2)} />
            <Mini label="Image" value={syntheticSubmission.imageProb.toFixed(2)} />
            <Mini label="Fused" value={syntheticSubmission.fusedProb.toFixed(2)} />
          </div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginTop: 12 }}>
            Flags raised
          </Text>
          <ul className={style({ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, paddingStart: 20 })}>
            {syntheticSubmission.flags.map((f, i) => (
              <li key={i}><Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-800)' }}>{f}</Text></li>
            ))}
          </ul>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--spectrum-global-color-gray-300)' }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
              Decision
            </Text>
            <Text UNSAFE_style={{ fontSize: 14, fontWeight: 700, color: 'var(--spectrum-global-color-red-600)' }}>{syntheticSubmission.decision}</Text>
          </div>
        </div>
      </div>

      <PatentBadge label="NE9 PATENT MOMENT" accent="red">
        Detection happens BEFORE outreach is sent. Generic deepfake detectors operate on
        consumer media; no event-tech vendor ships an integrated synthetic-candidate
        pipeline tied to recommendation and outreach. Detector is retrained quarterly.
      </PatentBadge>
    </div>
  )
}

function PolicyPanel(): React.ReactElement {
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE13" title="LLM linter blocks unsafe programming policies in CI" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        A foundation model whose system prompt encodes a versioned corpus of regulatory and
        ethical constraints reviews every policy change at deploy time. Violations fail CI.
      </Text>

      <div className={style({ display: 'grid', gap: 20, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 4 }}>
            Submitted policy (YAML)
          </Text>
          <pre
            style={{
              backgroundColor: 'var(--spectrum-global-color-gray-900)', color: 'var(--spectrum-global-color-gray-100)',
              fontSize: 11, fontFamily: 'monospace', padding: 12, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre'
            }}
          >
            {policyValidatorRun.policyYaml}
          </pre>
        </div>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 4 }}>
            Validator diagnostics
          </Text>
          {policyValidatorRun.diagnostics.map((d, i) => (
            <div
              key={i}
              style={{
                borderRadius: 8, padding: 12, marginBottom: 8,
                backgroundColor: d.severity === 'FAIL' ? 'var(--spectrum-global-color-gray-75)' : 'var(--spectrum-global-color-yellow-100)'
              }}
            >
              <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                <Badge variant={d.severity === 'FAIL' ? 'negative' : 'notice'} size="S">{d.severity}</Badge>
                <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)' }}>{d.citation}</Text>
              </div>
              <Text UNSAFE_style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>{d.rule}</Text>
              <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>Fix: {d.fix}</Text>
            </div>
          ))}
        </div>
      </div>

      <PatentBadge label="NE13 PATENT MOMENT" accent="navy">
        No event-tech vendor validates programming policies as a deploy-time CI gate.
        Quarterly legal reviews demonstrably lag policy edits. The foundation-model linter
        plus versioned constraint corpus + signed override audit is non-obvious in this domain.
      </PatentBadge>
    </div>
  )
}

function InjectionPanel(): React.ReactElement {
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE16" title="Free-text fields treated as data, never as instruction" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        Speaker bios, talk descriptions, and dietary notes are passed through a prompt-injection
        classifier and quoted as DATA before any downstream foundation-model call.
      </Text>

      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 })}>
        {promptInjectionExamples.map((ex, i) => (
          <div
            key={i}
            style={{
              borderRadius: 8, padding: 16,
              backgroundColor: ex.flagged ? 'var(--spectrum-global-color-gray-75)' : 'var(--spectrum-global-color-green-100)'
            }}
          >
            <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <Text UNSAFE_style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>{ex.field}</Text>
              <Badge variant={ex.flagged ? 'negative' : 'positive'} size="S">
                score {ex.classifierScore.toFixed(2)} · {ex.flagged ? 'FLAGGED' : 'CLEAN'}
              </Badge>
            </div>
            <Text
              UNSAFE_style={{
                display: 'block', fontSize: 12, fontFamily: 'monospace', color: 'var(--spectrum-global-color-gray-800)',
                backgroundColor: 'var(--s2-container-bg)', border: '1px solid var(--spectrum-global-color-gray-300)',
                borderRadius: 6, padding: 8, marginTop: 8, whiteSpace: 'pre-wrap'
              }}
            >
              {ex.text}
            </Text>
            <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 8 }}>Action: {ex.action}</Text>
          </div>
        ))}
      </div>

      <PatentBadge label="NE16 PATENT MOMENT" accent="red">
        Free-text never becomes instruction. The classifier flags suspect strings before
        any downstream LLM call; passing strings are wrapped as DATA with explicit boundaries.
        Trust scores per submitter decrement on confirmed attempts.
      </PatentBadge>
    </div>
  )
}

function ExplanationPanel(): React.ReactElement {
  const [variant, setVariant] = useState<ExplanationAudience>('candidateFacing')
  const labels: Record<ExplanationAudience, string> = {
    candidateFacing: 'Candidate',
    organizerFacing: 'Organizer',
    regulatorFacing: 'Regulator'
  }
  const v = explanationVariants[variant]
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE17" title="Three audience-specific explanations, one decision" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        For every automated decision, ENCORE produces immutable signed explanation variants
        tailored to the audience: candidate, organizer, and regulator. Each is hash-chained
        and bound to the same recommendation identifier.
      </Text>

      <div style={{ marginTop: 16 }}>
        <Tabs
          aria-label="Explanation audience"
          selectedKey={variant}
          onSelectionChange={(key) => setVariant(key as ExplanationAudience)}
          density="compact"
        >
          <TabList>
            {(Object.keys(labels) as ExplanationAudience[]).map((k) => (
              <Tab key={k} id={k}>{labels[k]}</Tab>
            ))}
          </TabList>
          {(Object.keys(labels) as ExplanationAudience[]).map((k) => (
            <TabPanel key={k} id={k}>
              <div style={{ borderRadius: 8, padding: 20, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
                <Text UNSAFE_style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
                  {labels[k]} variant
                </Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 18, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>{v.headline}</Text>
                <Text UNSAFE_style={{ display: 'block', fontSize: 13, color: 'var(--spectrum-global-color-gray-800)', marginTop: 12 }}>{v.body}</Text>
                <div className={style({ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 })}>
                  {v.actions.map((a, i) => (
                    <Badge key={i} variant="informative" size="S">{a}</Badge>
                  ))}
                </div>
              </div>
            </TabPanel>
          ))}
        </Tabs>
      </div>

      <PatentBadge label="NE17 PATENT MOMENT" accent="steel">
        EU AI Act Articles 13/14 plus GDPR Article 22 grant rights to meaningful explanation
        and human review. ENCORE produces audience-specific variants without cross-leak via
        selective disclosure. One-click dispute routing with bounded SLA.
      </PatentBadge>
    </div>
  )
}

function FailurePanel(): React.ReactElement {
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE22" title="Four-tier degradation with attested safe defaults" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        When the in-line forecaster fails, ENCORE degrades through four ordered tiers. Each
        tier transition produces a signed audit event with reason code. The deepest tier always
        routes to a human reviewer — never silently auto-approves.
      </Text>

      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 })}>
        {failureModeTiers.map((t) => {
          const isHealthy = t.status === 'HEALTHY'
          return (
            <div
              key={t.tier}
              className={style({ display: 'flex', alignItems: 'center', gap: 16 })}
              style={{
                padding: 16, borderRadius: 8,
                backgroundColor: isHealthy ? 'var(--spectrum-global-color-green-100)' : 'var(--spectrum-global-color-gray-75)'
              }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  fontWeight: 700, color: 'white',
                  backgroundColor: isHealthy ? 'var(--spectrum-global-color-green-600)' : 'var(--spectrum-global-color-gray-500)'
                }}
              >
                T{t.tier}
              </div>
              <div style={{ flex: 1 }}>
                <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })}>
                  <Text UNSAFE_style={{ fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>{t.name}</Text>
                  <StatusLight variant={isHealthy ? 'positive' : 'neutral'} size="S">{t.status}</StatusLight>
                </div>
                <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>{t.description}</Text>
              </div>
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>
                {typeof t.latencyMs === 'number' ? `${t.latencyMs} ms` : t.latencyMs}
              </Text>
            </div>
          )
        })}
      </div>

      <PatentBadge label="NE22 PATENT MOMENT" accent="navy">
        Every tier transition emits a signed audit event with reason code. The deepest tier
        ALWAYS routes to a human; nothing is silently auto-approved. The hierarchy is
        deployment-time-validated by the LLM policy linter (NE13).
      </PatentBadge>
    </div>
  )
}

function AttestationPanel(): React.ReactElement {
  const c = didSpeakCredential
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE23" title="Speakers carry tamper-proof proof of attendance" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        At session completion, ENCORE mints a W3C Verifiable Credential with BBS+ selective
        disclosure. Speakers can later present this proof to a CME registrar, employer, or
        regulator without revealing audience size or sponsor details.
      </Text>

      <div className={style({ display: 'grid', gap: 20, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ gridColumn: 'span 2', borderRadius: 8, padding: 20, color: 'white', backgroundColor: 'var(--spectrum-global-color-blue-600)' }}>
          <div className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
            <Text UNSAFE_style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.8)' }}>Verifiable Credential</Text>
            <div className={style({ display: 'flex', alignItems: 'center', gap: 4 })}>
              <BadgeVerified />
              <Text UNSAFE_style={{ fontSize: 10, color: 'white' }}>W3C VC + BBS+</Text>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 20, fontWeight: 700, color: 'white' }}>{c.subject.speakerName}</Text>
            <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{c.session}</Text>
            <Text UNSAFE_style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {c.event} · {c.date} · {c.durationMinutes} minutes
            </Text>
          </div>
          <div className={style({ display: 'grid', gap: 12, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)' }}>
                Session start signal
              </Text>
              <Text UNSAFE_style={{ fontSize: 11, color: 'white' }}>{c.startSignal}</Text>
            </div>
            <div>
              <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)' }}>
                Session end signal
              </Text>
              <Text UNSAFE_style={{ fontSize: 11, color: 'white' }}>{c.endSignal}</Text>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)' }}>
              Selective disclosure
            </Text>
            <Text UNSAFE_style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>{c.selectiveDisclosure}</Text>
          </div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', marginTop: 12 }}>
            HSM signature: {c.hsmSignature}
          </Text>
        </div>

        <div style={{ borderRadius: 8, padding: 16, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
          <Text UNSAFE_style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>
            Presentable to
          </Text>
          <ul className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingStart: 0 })} style={{ listStyle: 'none' }}>
            {c.presentableTo.map((r, i) => (
              <li key={i} className={style({ display: 'flex', gap: 8 })}>
                <span style={{ color: 'var(--spectrum-global-color-green-600)' }}>✓</span>
                <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{r}</Text>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PatentBadge label="NE23 PATENT MOMENT" accent="mint">
        Speakers hold the credential. They choose which fields to reveal. Adobe never sees
        what they present to whom. Trust transfers without intermediaries.
      </PatentBadge>
    </div>
  )
}

function CrossBorderPanel(): React.ReactElement {
  const c = crossBorderRePolicy
  return (
    <div style={CARD_STYLE}>
      <PanelHeader ne="NE21" title="Move an event to a new country; the policy follows" />
      <Text UNSAFE_style={{ display: 'block', fontSize: 14, color: 'var(--spectrum-global-color-gray-800)', marginTop: 8 }}>
        Continuous monitoring of jurisdiction-relevant signals: venue, candidate residency,
        sponsor jurisdiction, payment instrument origin, broadcast region. Whenever any of
        these change, the policy is re-evaluated and the consent receipt updated.
      </Text>

      <div className={style({ display: 'grid', gap: 16, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div style={{ borderRadius: 8, padding: 16, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}>
          <Text UNSAFE_style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>Original</Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>{c.originalVenue}</Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>EU + EU AI Act + GDPR</Text>
        </div>
        <div
          style={{
            borderRadius: 8, padding: 16,
            backgroundColor: 'var(--spectrum-global-color-gray-75)'
          }}
        >
          <Text UNSAFE_style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>Updated</Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)', marginTop: 4 }}>{c.newVenue}</Text>
          <Text UNSAFE_style={{ display: 'block', fontSize: 11, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>UK + UK GDPR + UK DPA 2018</Text>
          <Text UNSAFE_style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, color: 'var(--spectrum-global-color-gray-600)', marginTop: 4 }}>{c.triggerTime}</Text>
        </div>
      </div>

      <div className={style({ display: 'grid', gap: 16, marginTop: 16 })} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 4 }}>
            Detected changes
          </Text>
          <ul className={style({ display: 'flex', flexDirection: 'column', gap: 4, paddingStart: 20 })}>
            {c.detectedChanges.map((x, i) => (
              <li key={i}><Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{x}</Text></li>
            ))}
          </ul>
        </div>
        <div>
          <Text UNSAFE_style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)', marginBottom: 4 }}>
            Policy updates applied
          </Text>
          <ul className={style({ display: 'flex', flexDirection: 'column', gap: 4, paddingStart: 20 })}>
            {c.policyUpdates.map((x, i) => (
              <li key={i}><Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-800)' }}>{x}</Text></li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 })}
        style={{ borderRadius: 8, padding: 12, backgroundColor: 'var(--spectrum-global-color-gray-75)' }}
      >
        <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
          Subjects notified:{' '}
          <span style={{ color: 'var(--spectrum-global-color-gray-900)', fontFamily: 'monospace' }}>
            {c.affectedSubjects.speakers} speakers · {c.affectedSubjects.sponsors} sponsors · {c.affectedSubjects.attendees.toLocaleString()} attendees
          </span>
        </Text>
        <Badge variant={c.notificationSent ? 'positive' : 'notice'} size="S">{c.notificationSent ? 'NOTIFIED' : 'PENDING'}</Badge>
      </div>

      <PatentBadge label="NE21 PATENT MOMENT" accent="steel">
        Continuous monitoring means policy changes BEFORE the event happens in the new
        jurisdiction. Each subject receives a one-tap acknowledge. No manual legal review
        cycle required for cross-border moves.
      </PatentBadge>
    </div>
  )
}

function Mini({ label, value }: { label: string, value: string }): React.ReactElement {
  return (
    <div style={{ textAlign: 'center', borderRadius: 6, padding: 8, backgroundColor: 'var(--s2-container-bg)' }}>
      <Text UNSAFE_style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--spectrum-global-color-gray-600)' }}>{label}</Text>
      <Text UNSAFE_style={{ fontSize: 18, fontWeight: 700, color: 'var(--spectrum-global-color-red-600)' }}>{value}</Text>
    </div>
  )
}

export default Act8Extended
