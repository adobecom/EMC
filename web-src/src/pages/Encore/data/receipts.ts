/*
* <license header>
*/

import type { AuditTimelineEntry, Receipt } from '../types'

// Signed JSON-LD Verifiable Credential, hash-chained, with BBS+ selective disclosure.
export const sampleReceipt: Receipt = {
  receiptId: 'rcpt-evt-max26-ai-spk-001-slot-1-v1',
  recommendationId: 'rec-2026-06-08T14:22:11Z-7f4a',
  context: ['https://www.w3.org/2018/credentials/v1', 'https://encore.adobe.com/vocab/v1'],
  type: ['VerifiableCredential', 'EncoreRecommendation'],
  issuer: 'did:web:encore.adobe.com',
  issuedAt: '2026-06-08T14:22:11Z',
  subject: {
    speakerId: 'spk-001',
    speakerName: 'Dr. Sarah Chen',
    eventId: 'evt-max26-ai',
    slot: 1
  },
  recommendation: {
    forecastProbability: 0.87,
    confidenceInterval: [0.83, 0.91],
    audiencePersonaMix: { 'cto-ai': 0.42, martech: 0.31, devrel: 0.27 },
    modelId: 'encore-tier1-gbm-v2.4.1',
    tier2ModelId: 'encore-tier2-gnn-v2.4.1',
    foundationModelForDrafting: 'claude-sonnet-4-5-20250929',
    policyVersion: 'p-2026Q2',
    brierScoreBaseline: 0.11,
    isotonicCalibratorVersion: 'iso-2026Q1'
  },
  contributingFeatures: [
    { feature: 'Topical fit (AI safety x AI-Lead persona)', weight: 0.34 },
    { feature: 'Citation velocity (12-mo, +218%)', weight: 0.21 },
    { feature: 'Prior NPS (across 6 events, mean 82)', weight: 0.19 },
    { feature: 'Audience persona overlap', weight: 0.16 },
    { feature: 'Sponsor objective compatibility (4 of 8)', weight: 0.10 }
  ],
  provenance: {
    ingestionReceiptChainRoot: '0x9c41a8e3b2...',
    merkleRoot: '0xa19b6c4d2f10ef7c4b8a2d6f3c91b04a72e8f53d8c12bd9a4f3e2c1b0a987d65',
    anchoredAt: '2026-06-08T15:00:00Z',
    anchorChain: 'opentimestamps-bitcoin',
    hsmSignature: '0x4b7c1a3d8e9f2c5d6a8b3e7c5d2f1a4e7b3c5d9f1e8c2a6d4b3e7c1a9f5d8e2c'
  },
  selectiveDisclosure: {
    scheme: 'BBS+-2023',
    revealableFields: [
      'subject.speaker_id', 'subject.event_id', 'subject.slot',
      'recommendation.forecast_probability', 'recommendation.confidence_interval',
      'recommendation.model_id', 'recommendation.policy_version',
      'contributing_features'
    ]
  },
  governanceBadges: [
    'GDPR Article 22: explanation available on request',
    'EU AI Act Articles 13/14: transparency satisfied',
    'Adobe AI Ethics: accountability + transparency'
  ]
}

export const auditTimeline: AuditTimelineEntry[] = [
  { time: '14:22:11', event: 'Recommendation issued (slot 1: Dr. Sarah Chen)', receiptId: 'rcpt-…-slot-1-v1' },
  { time: '14:24:03', event: 'Voice-similar abstract drafted (similarity 0.87, PASS)', receiptId: 'rcpt-…-draft-v1' },
  { time: '14:24:21', event: 'Invitation generated and signed (HMAC URL, channel: LinkedIn)', receiptId: 'rcpt-…-invite-v1' },
  { time: '14:27:42', event: 'Counter-proposal received, Layer 4 re-optimization', receiptId: 'rcpt-…-reopt-v1' },
  { time: '14:28:09', event: 'Revised proposal sent', receiptId: 'rcpt-…-invite-v2' },
  { time: '14:31:14', event: 'Acceptance recorded', receiptId: 'rcpt-…-accept-v1' }
]
