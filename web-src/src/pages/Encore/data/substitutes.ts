/*
* <license header>
*/

import type { Cancellation, DriftStatus, SubstituteCandidate } from '../types'

// Real-time substitution: cancelled speaker, top 3 substitutes with deltas.
export const cancellation: Cancellation = {
  cancelledSpeakerId: 'spk-004',
  cancelledName: 'Dr. Jin Lee',
  cancelledSlot: 2,
  cancelledSession: 'Tool-Using Agents: Real Production Lessons',
  timeToEventHours: 48,
  reason: 'Speaker family emergency'
}

export const substituteCandidates: SubstituteCandidate[] = [
  {
    speakerId: 'spk-010', name: 'Dr. Olivia Greene', headline: 'Multi-Modal Foundation Models',
    forecastP: 0.79, ci: [0.74, 0.83],
    deltaEngagement: -0.04, deltaSponsor: 0.00, deltaPersona: -0.02,
    availability: 'Confirmed (was already attending as panelist)',
    recommendation: 'TOP CHOICE'
  },
  {
    speakerId: 'spk-011', name: 'Tarek Hassan', headline: 'Open Source ML, Voice Models',
    forecastP: 0.77, ci: [0.72, 0.82],
    deltaEngagement: -0.06, deltaSponsor: -0.01, deltaPersona: -0.03,
    availability: 'Likely (visa already arranged)',
    recommendation: 'Acceptable'
  },
  {
    speakerId: 'spk-005', name: 'Carlos Mendes', headline: 'Foundation Models, Long Context',
    forecastP: 0.74, ci: [0.69, 0.79],
    deltaEngagement: -0.09, deltaSponsor: 0.00, deltaPersona: -0.04,
    availability: 'Backup (would need pre-recorded contribution)',
    recommendation: 'Acceptable'
  }
]

export const driftStatus: DriftStatus = {
  currentBrier: 0.13,
  baselineBrier: 0.11,
  trend: 'rising (3 cycles)',
  driftThreshold: 0.15,
  retrainQueued: true,
  canaryRoundId: 'cn-2026-06-09-001',
  promotionEta: '2026-06-20T12:00:00Z',
  modelVersionCurrent: 'v2.4.1',
  modelVersionCandidate: 'v2.5.0-rc1'
}
