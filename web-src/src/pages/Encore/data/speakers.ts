/*
* <license header>
*/

import type { AudienceId, AudienceScore, CandidateSpeaker } from '../types'

// Calibrated audience-conditioned probabilities (Brier-validated 0.11).
// Each speaker carries probabilities conditioned on different audiences.
export const candidateSpeakers: CandidateSpeaker[] = [
  {
    id: 'spk-001', name: 'Dr. Sarah Chen',
    affiliation: 'Stanford / ex-OpenAI Safety',
    headline: 'AI Safety, Agentic Systems',
    avatar: 'SC', avatarBg: '#1E2761',
    community: 'AI Safety + Regulated-Industry',
    feeUsd: 95000, location: 'San Francisco, CA',
    scoresByAudience: {
      'cto-ai': { p: 0.87, lo: 0.83, hi: 0.91 },
      martech: { p: 0.71, lo: 0.65, hi: 0.77 },
      devrel: { p: 0.74, lo: 0.69, hi: 0.79 }
    },
    contributing: [
      { feature: 'Topical fit (AI safety x AI-Lead persona)', weight: 0.34 },
      { feature: 'Citation velocity (12-mo, +218%)', weight: 0.21 },
      { feature: 'Prior NPS (across 6 events, mean 82)', weight: 0.19 },
      { feature: 'Audience persona overlap', weight: 0.16 },
      { feature: 'Sponsor objective compatibility (4 of 8)', weight: 0.10 }
    ],
    publicTalks: 14,
    publicArticles: 28,
    publicPosts: 31
  },
  {
    id: 'spk-002', name: 'Prof. Marcus Rivera',
    affiliation: 'MIT CSAIL',
    headline: 'Reinforcement Learning, Robotics',
    avatar: 'MR', avatarBg: '#2F3C7E',
    community: 'AI Safety + Regulated-Industry',
    feeUsd: 78000, location: 'Cambridge, MA',
    scoresByAudience: {
      'cto-ai': { p: 0.84, lo: 0.79, hi: 0.88 },
      martech: { p: 0.55, lo: 0.49, hi: 0.61 },
      devrel: { p: 0.77, lo: 0.72, hi: 0.82 }
    }
  },
  {
    id: 'spk-003', name: 'Aisha Patel',
    affiliation: 'CTO, FinTech unicorn',
    headline: 'AI in Finance, Risk Modeling',
    avatar: 'AP', avatarBg: '#4FBF73',
    community: 'AI Safety + Regulated-Industry',
    feeUsd: 65000, location: 'London, UK',
    scoresByAudience: {
      'cto-ai': { p: 0.81, lo: 0.76, hi: 0.85 },
      martech: { p: 0.69, lo: 0.63, hi: 0.74 },
      devrel: { p: 0.66, lo: 0.60, hi: 0.71 }
    }
  },
  {
    id: 'spk-004', name: 'Dr. Jin Lee',
    affiliation: 'Google DeepMind',
    headline: 'Agentic AI, Tool Use',
    avatar: 'JL', avatarBg: '#FA0F00',
    community: 'Agentic AI + Developer',
    feeUsd: 92000, location: 'Mountain View, CA',
    scoresByAudience: {
      'cto-ai': { p: 0.83, lo: 0.78, hi: 0.87 },
      martech: { p: 0.58, lo: 0.52, hi: 0.64 },
      devrel: { p: 0.86, lo: 0.82, hi: 0.90 }
    }
  },
  {
    id: 'spk-005', name: 'Carlos Mendes',
    affiliation: 'Anthropic Engineering',
    headline: 'Foundation Models, Long Context',
    avatar: 'CM', avatarBg: '#D4A017',
    community: 'Agentic AI + Developer',
    feeUsd: 70000, location: 'San Francisco, CA',
    scoresByAudience: {
      'cto-ai': { p: 0.79, lo: 0.74, hi: 0.83 },
      martech: { p: 0.52, lo: 0.46, hi: 0.58 },
      devrel: { p: 0.82, lo: 0.77, hi: 0.86 }
    }
  },
  {
    id: 'spk-006', name: 'Emily Watson',
    affiliation: 'Head of AI, Marketo customer',
    headline: 'MarTech AI Stack, Lead Scoring',
    avatar: 'EW', avatarBg: '#2F3C7E',
    community: 'MarTech + Marketing-Ops',
    feeUsd: 48000, location: 'Austin, TX',
    scoresByAudience: {
      'cto-ai': { p: 0.62, lo: 0.56, hi: 0.68 },
      martech: { p: 0.84, lo: 0.79, hi: 0.88 },
      devrel: { p: 0.58, lo: 0.52, hi: 0.64 }
    }
  },
  {
    id: 'spk-007', name: 'Raj Krishnan',
    affiliation: 'VP AI, Salesforce',
    headline: 'Generative AI in CRM',
    avatar: 'RK', avatarBg: '#1E2761',
    community: 'MarTech + Marketing-Ops',
    feeUsd: 55000, location: 'San Francisco, CA',
    scoresByAudience: {
      'cto-ai': { p: 0.69, lo: 0.64, hi: 0.74 },
      martech: { p: 0.82, lo: 0.77, hi: 0.86 },
      devrel: { p: 0.61, lo: 0.55, hi: 0.67 }
    }
  },
  {
    id: 'spk-008', name: 'Sofia Andersson',
    affiliation: 'Stockholm AI ethics researcher',
    headline: 'AI Governance, EU AI Act',
    avatar: 'SA', avatarBg: '#FA0F00',
    community: 'AI Safety + Regulated-Industry',
    feeUsd: 60000, location: 'Stockholm, Sweden',
    scoresByAudience: {
      'cto-ai': { p: 0.82, lo: 0.77, hi: 0.86 },
      martech: { p: 0.74, lo: 0.69, hi: 0.79 },
      devrel: { p: 0.68, lo: 0.62, hi: 0.73 }
    }
  },
  {
    id: 'spk-009', name: 'David Park',
    affiliation: 'Field CTO, Snowflake',
    headline: 'Data Cloud + AI',
    avatar: 'DP', avatarBg: '#4FBF73',
    community: 'MarTech + Marketing-Ops',
    feeUsd: 45000, location: 'Seattle, WA',
    scoresByAudience: {
      'cto-ai': { p: 0.74, lo: 0.69, hi: 0.79 },
      martech: { p: 0.78, lo: 0.73, hi: 0.82 },
      devrel: { p: 0.65, lo: 0.60, hi: 0.70 }
    }
  },
  {
    id: 'spk-010', name: 'Dr. Olivia Greene',
    affiliation: 'Cambridge AI Lab',
    headline: 'Multi-Modal Foundation Models',
    avatar: 'OG', avatarBg: '#D4A017',
    community: 'Agentic AI + Developer',
    feeUsd: 72000, location: 'Cambridge, UK',
    scoresByAudience: {
      'cto-ai': { p: 0.80, lo: 0.75, hi: 0.84 },
      martech: { p: 0.56, lo: 0.50, hi: 0.62 },
      devrel: { p: 0.79, lo: 0.74, hi: 0.83 }
    }
  },
  {
    id: 'spk-011', name: 'Tarek Hassan',
    affiliation: 'Hugging Face DevRel',
    headline: 'Open Source ML, Voice Models',
    avatar: 'TH', avatarBg: '#2F3C7E',
    community: 'Agentic AI + Developer',
    feeUsd: 38000, location: 'Cairo, Egypt',
    scoresByAudience: {
      'cto-ai': { p: 0.71, lo: 0.66, hi: 0.76 },
      martech: { p: 0.49, lo: 0.43, hi: 0.55 },
      devrel: { p: 0.84, lo: 0.79, hi: 0.88 }
    }
  },
  {
    id: 'spk-012', name: 'Priya Iyer',
    affiliation: 'NVIDIA AI Solutions',
    headline: 'Enterprise AI Infrastructure',
    avatar: 'PI', avatarBg: '#FA0F00',
    community: 'AI Safety + Regulated-Industry',
    feeUsd: 56000, location: 'Santa Clara, CA',
    scoresByAudience: {
      'cto-ai': { p: 0.78, lo: 0.73, hi: 0.82 },
      martech: { p: 0.61, lo: 0.55, hi: 0.67 },
      devrel: { p: 0.72, lo: 0.67, hi: 0.77 }
    }
  }
]

// Combined audience-conditioned score against the target event's persona mix
// (42% CTO-AI + 31% MarTech + 27% DevRel).
const AUDIENCE_WEIGHTS: Record<AudienceId, number> = { 'cto-ai': 0.42, martech: 0.31, devrel: 0.27 }

export function combinedScore(s: CandidateSpeaker): number {
  const p = (s.scoresByAudience['cto-ai'].p * AUDIENCE_WEIGHTS['cto-ai']) +
    (s.scoresByAudience.martech.p * AUDIENCE_WEIGHTS.martech) +
    (s.scoresByAudience.devrel.p * AUDIENCE_WEIGHTS.devrel)
  return Number(p.toFixed(2))
}

export function audienceScore(s: CandidateSpeaker, audienceId: AudienceId): AudienceScore {
  return s.scoresByAudience[audienceId]
}
