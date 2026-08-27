/*
* <license header>
*/

import type { BrierPoint, FederatedOrganizer, RoundSummary } from '../types'

// Federated cross-organizer reputation network: 10 organizers, per-organizer DP epsilon.
export const federatedOrganizers: FederatedOrganizer[] = [
  { id: 'org-A', label: 'Org-A', sector: 'Software', epsilon: 2.0, status: 'contributing', reputation: 0.94 },
  { id: 'org-B', label: 'Org-B', sector: 'Finance', epsilon: 1.2, status: 'contributing', reputation: 0.92 },
  { id: 'org-C', label: 'Org-C', sector: 'Pharma', epsilon: 1.0, status: 'contributing', reputation: 0.95 },
  { id: 'org-D', label: 'Org-D', sector: 'Government', epsilon: 0.8, status: 'contributing', reputation: 0.90 },
  { id: 'org-E', label: 'Org-E', sector: 'Defense', epsilon: 0.9, status: 'contributing', reputation: 0.88 },
  { id: 'org-F', label: 'Org-F', sector: 'Software', epsilon: 2.5, status: 'contributing', reputation: 0.86 },
  { id: 'org-G', label: 'Org-G', sector: 'Marketing-Tech', epsilon: 2.0, status: 'flagged-outlier', reputation: 0.61 },
  { id: 'org-H', label: 'Org-H', sector: 'Healthcare', epsilon: 1.4, status: 'contributing', reputation: 0.89 },
  { id: 'org-I', label: 'Org-I', sector: 'Retail', epsilon: 2.2, status: 'contributing', reputation: 0.93 },
  { id: 'org-J', label: 'Org-J (Adobe)', sector: 'Marketing-Tech', epsilon: 2.0, status: 'contributing', reputation: 0.97, self: true }
]

export const roundSummary: RoundSummary = {
  roundId: 47,
  contributingOrganizers: 9,
  excludedOrganizers: ['org-G'],
  metaDetectorState: {
    reputationScore: 'PASS',
    gradientOutlier: 'AMBER (Org-G flagged: direction deviated 4.2σ)',
    byzantineRobust: 'PASS (median-of-means + Krum)',
    challengeRound: 'PASS (synthetic poison rejected by 9/10)'
  },
  globalModelDelta: { brierBefore: 0.12, brierAfter: 0.11, deltaPct: -8.3 },
  rarePatternSurfaced: 'AI-governance speakers strongly predict engagement with regulated-industry audiences (n=143 across federation, undetectable to any single organizer below n=18).',
  provenanceManifest: {
    aggregationScheme: 'Bonawitz-2017 secure aggregation',
    dpTotal: 1.62,
    contributorCount: 9,
    individualContributionsVisible: false
  }
}

// Historical Brier across 8 most recent rounds for the line chart.
export const brierTrajectory: BrierPoint[] = [
  { round: 40, brier: 0.18 },
  { round: 41, brier: 0.17 },
  { round: 42, brier: 0.15 },
  { round: 43, brier: 0.14 },
  { round: 44, brier: 0.13 },
  { round: 45, brier: 0.12 },
  { round: 46, brier: 0.12 },
  { round: 47, brier: 0.11 }
]
