/*
* <license header>
*/

import type { Draft, InvitationMeta, VoiceCorpus } from '../types'

// Voice corpus stubs for the demo speaker (Dr. Sarah Chen).
// In production these embeddings come from public talks under platform terms.
export const voiceCorpusSarahChen: VoiceCorpus = {
  speakerId: 'spk-001',
  speakerName: 'Dr. Sarah Chen',
  talks: 14,
  articles: 28,
  posts: 31,
  recentTalks: [
    { title: 'Agentic AI Safety: What We Learned at OpenAI', venue: 'NeurIPS 2024', durationMin: 38 },
    { title: 'Constitutional AI for Production Systems', venue: 'AAAI 2024', durationMin: 42 },
    { title: 'The Operator Pattern for Tool-Using LLMs', venue: 'Strange Loop 2023', durationMin: 31 }
  ],
  voiceMarkers: [
    'Opens talks with a concrete failure story before any framework',
    'Prefers "let me show you" over "this slide shows"',
    'Uses precise probabilistic language: "roughly 80 percent" not "most"',
    'Anchors abstract concepts to one running operational example'
  ],
  embeddingDistributionPreview: [
    { dim: 1, value: 0.34 }, { dim: 2, value: -0.12 }, { dim: 3, value: 0.41 },
    { dim: 4, value: 0.18 }, { dim: 5, value: -0.07 }, { dim: 6, value: 0.29 },
    { dim: 7, value: 0.22 }, { dim: 8, value: 0.05 }, { dim: 9, value: -0.16 },
    { dim: 10, value: 0.31 }
  ]
}

export const voiceSimilarDraft: Draft = {
  speakerId: 'spk-001',
  text: 'Let me start with a failure story. Last year an enterprise agent we deployed promised a customer a refund it had no authority to issue. We had safety scaffolding everywhere except the moment it mattered. In this session I will show you the operator pattern we built afterward, the four times we caught the same failure class in staging since, and the calibration that lets us trust the agent in production today. Concrete code, concrete numbers, and the exact place we still get it wrong.',
  similarity: 0.87,
  threshold: 0.85,
  pass: true,
  modelId: 'foundation-model-v1.3',
  attempts: 1
}

export const genericDraft: Draft = {
  speakerId: 'spk-001',
  text: 'In this talk, we will explore the exciting world of agentic AI safety. We will discuss best practices, common challenges, and emerging trends in deploying agents at scale. Attendees will leave with actionable insights and a deeper understanding of how to build safe, reliable AI systems for the enterprise.',
  similarity: 0.42,
  threshold: 0.85,
  pass: false,
  modelId: 'foundation-model-v1.3-uncondidtioned',
  attempts: 1
}

export const invitationMeta: InvitationMeta = {
  hmacUrl: 'https://encore.adobe.com/i/eyJhbGciOiJIUzI1NiIsImtpZCI6IjFBN0Y0RTMyIn0.eyJzcGsiOiJzcGstMDAxIiwiZXZ0IjoiZXZ0LW1heDI2LWFpIiwiZXhwIjoxNzM2ODI4ODAwfQ.HMACSIGNATURE',
  channelSelected: 'LinkedIn message',
  channelPropensity: 0.74,
  fallbackChannels: ['email (0.52)', 'paired-app push (0.31)', 'routed human (0.18)'],
  proposedSlots: [
    { iso: '2026-10-13T09:00:00-07:00', label: 'Mon Oct 13, 9:00 AM PT (Keynote)' },
    { iso: '2026-10-13T13:00:00-07:00', label: 'Mon Oct 13, 1:00 PM PT' },
    { iso: '2026-10-14T10:30:00-07:00', label: 'Tue Oct 14, 10:30 AM PT' }
  ],
  calendarEvidence: [
    'Public posts: "Speaking at NeurIPS Dec 9" (no Oct conflict)',
    'Travel pattern: West Coast most of October per posted schedule',
    'No competing event on calendar Oct 12-16 (publicly inferred)'
  ]
}
