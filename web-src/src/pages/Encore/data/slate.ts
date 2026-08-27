/*
* <license header>
*/

import type { ParetoAlternative, SlateMetrics, SlateRow } from '../types'

// Primary slate returned by the three-sided MIP solver.
export const primarySlate: SlateRow[] = [
  { slot: 1, day: 'Mon Oct 13', time: '09:00', speakerId: 'spk-001', sessionTitle: 'Agentic AI Safety at Enterprise Scale', sponsorsCovered: ['NVIDIA', 'ServiceNow'], persona: 'cto-ai' },
  { slot: 2, day: 'Mon Oct 13', time: '10:30', speakerId: 'spk-004', sessionTitle: 'Tool-Using Agents: Real Production Lessons', sponsorsCovered: ['AWS', 'GitHub'], persona: 'cto-ai' },
  { slot: 3, day: 'Mon Oct 13', time: '13:00', speakerId: 'spk-006', sessionTitle: 'MarTech AI Stack: A Reference Architecture', sponsorsCovered: ['Salesforce', 'Databricks'], persona: 'martech' },
  { slot: 4, day: 'Mon Oct 13', time: '14:30', speakerId: 'spk-008', sessionTitle: 'EU AI Act in Practice for Marketing Platforms', sponsorsCovered: ['ServiceNow'], persona: 'cto-ai' },
  { slot: 5, day: 'Mon Oct 13', time: '16:00', speakerId: 'spk-011', sessionTitle: 'Open Voice Models for Conversational Commerce', sponsorsCovered: ['Hugging Face'], persona: 'devrel' },
  { slot: 6, day: 'Tue Oct 14', time: '09:00', speakerId: 'spk-002', sessionTitle: 'RL for Autonomous Systems in Critical Domains', sponsorsCovered: ['NVIDIA'], persona: 'cto-ai' },
  { slot: 7, day: 'Tue Oct 14', time: '10:30', speakerId: 'spk-007', sessionTitle: 'Generative AI in CRM: 90 Day Roadmap', sponsorsCovered: ['Salesforce'], persona: 'martech' },
  { slot: 8, day: 'Tue Oct 14', time: '13:00', speakerId: 'spk-010', sessionTitle: 'Multi-Modal Foundation Models: What is Next', sponsorsCovered: ['AWS'], persona: 'devrel' },
  { slot: 9, day: 'Tue Oct 14', time: '14:30', speakerId: 'spk-003', sessionTitle: 'AI Risk Modeling for Regulated Markets', sponsorsCovered: ['Snowflake', 'ServiceNow'], persona: 'cto-ai' },
  { slot: 10, day: 'Tue Oct 14', time: '16:00', speakerId: 'spk-005', sessionTitle: 'Long-Context Reasoning in Production', sponsorsCovered: ['GitHub', 'Hugging Face'], persona: 'devrel' },
  { slot: 11, day: 'Wed Oct 15', time: '09:00', speakerId: 'spk-012', sessionTitle: 'GPU Infrastructure for Enterprise AI', sponsorsCovered: ['NVIDIA', 'Databricks'], persona: 'cto-ai' },
  { slot: 12, day: 'Wed Oct 15', time: '10:30', speakerId: 'spk-009', sessionTitle: 'Data Cloud + AI: One Loop, One Source of Truth', sponsorsCovered: ['Snowflake', 'Salesforce'], persona: 'martech' }
]

export const slateMetrics: SlateMetrics = {
  totalEngagementPSum: 9.62,
  sponsorCoverage: '8 of 8',
  personaMatch: { 'cto-ai': '6 sessions (50%)', martech: '3 sessions (25%)', devrel: '3 sessions (25%)' },
  budgetUsedUsd: 774000,
  budgetRemainingUsd: 76000,
  diversityScore: 0.91,
  geographicDistribution: ['US East', 'US West', 'Europe', 'Asia'],
  solverMs: 4180
}

// Pareto-frontier alternatives — 3 alternate slates with different weightings.
export const paretoAlternatives: ParetoAlternative[] = [
  {
    name: 'A: Sponsor-weighted',
    engagement: 9.41,
    sponsorCoverage: '8 of 8 (deeper)',
    personaMatchVar: '+0.04',
    budgetPct: 0.93,
    tradeoff: 'Sponsor objectives get extra coverage at -0.21 engagement and tighter budget.'
  },
  {
    name: 'B: Diversity-weighted',
    engagement: 9.53,
    sponsorCoverage: '7 of 8',
    personaMatchVar: '+0.07',
    budgetPct: 0.85,
    tradeoff: 'Broader speaker demographics; one sponsor objective uncovered.'
  },
  {
    name: 'C: Budget-tight',
    engagement: 9.46,
    sponsorCoverage: '8 of 8',
    personaMatchVar: '0.00',
    budgetPct: 0.78,
    tradeoff: '$60K under budget; -0.16 engagement vs primary; same sponsor coverage.'
  }
]
