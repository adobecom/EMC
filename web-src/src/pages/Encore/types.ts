/*
* <license header>
*/

// ============================================================================
// Act 0 — past events / target event
// ============================================================================

export interface PastEvent {
  id: string
  name: string
  city: string
  attendees: number
  nps: number
  sessions: number
  sponsors: number
  status: string
}

export interface PersonaMixEntry {
  id: string
  label: string
  pct: number
}

export interface TargetEvent {
  id: string
  name: string
  city: string
  dates: string
  attendeesForecast: number
  sessions: number
  speakerBudgetUsd: number
  personas: PersonaMixEntry[]
  sponsors: string[]
  status: string
}

// ============================================================================
// Act 1 — speakers, communities, audience-conditioned scores
// ============================================================================

export type AudienceId = 'cto-ai' | 'martech' | 'devrel'

export interface AudienceScore {
  p: number
  lo: number
  hi: number
}

export interface ContributingFeature {
  feature: string
  weight: number
}

export interface CandidateSpeaker {
  id: string
  name: string
  affiliation: string
  headline: string
  avatar: string
  avatarBg: string
  community: string
  feeUsd: number
  location: string
  scoresByAudience: Record<AudienceId, AudienceScore>
  contributing?: ContributingFeature[]
  publicTalks?: number
  publicArticles?: number
  publicPosts?: number
}

export interface Community {
  id: string
  label: string
  color: string
  speakers: string[]
  topics: string[]
  sponsors: string[]
  personas: string[]
}

// ============================================================================
// Act 2 — slate optimization
// ============================================================================

export interface SlateRow {
  slot: number
  day: string
  time: string
  speakerId: string
  sessionTitle: string
  sponsorsCovered: string[]
  persona: AudienceId
}

export interface SlateMetrics {
  totalEngagementPSum: number
  sponsorCoverage: string
  personaMatch: Record<string, string>
  budgetUsedUsd: number
  budgetRemainingUsd: number
  diversityScore: number
  geographicDistribution: string[]
  solverMs: number
}

export interface ParetoAlternative {
  name: string
  engagement: number
  sponsorCoverage: string
  personaMatchVar: string
  budgetPct: number
  tradeoff: string
}

// ============================================================================
// Act 3 — voice corpus / outreach
// ============================================================================

export interface RecentTalk {
  title: string
  venue: string
  durationMin: number
}

export interface EmbeddingDim {
  dim: number
  value: number
}

export interface VoiceCorpus {
  speakerId: string
  speakerName: string
  talks: number
  articles: number
  posts: number
  recentTalks: RecentTalk[]
  voiceMarkers: string[]
  embeddingDistributionPreview: EmbeddingDim[]
}

export interface Draft {
  speakerId: string
  text: string
  similarity: number
  threshold: number
  pass: boolean
  modelId: string
  attempts: number
}

export interface ProposedSlot {
  iso: string
  label: string
}

export interface InvitationMeta {
  hmacUrl: string
  channelSelected: string
  channelPropensity: number
  fallbackChannels: string[]
  proposedSlots: ProposedSlot[]
  calendarEvidence: string[]
}

// ============================================================================
// Act 4 — receipts / audit
// ============================================================================

export interface ReceiptSubject {
  speakerId: string
  speakerName: string
  eventId: string
  slot: number
}

export interface ReceiptRecommendation {
  forecastProbability: number
  confidenceInterval: [number, number]
  audiencePersonaMix: Record<AudienceId, number>
  modelId: string
  tier2ModelId: string
  foundationModelForDrafting: string
  policyVersion: string
  brierScoreBaseline: number
  isotonicCalibratorVersion: string
}

export interface ReceiptProvenance {
  ingestionReceiptChainRoot: string
  merkleRoot: string
  anchoredAt: string
  anchorChain: string
  hsmSignature: string
}

export interface SelectiveDisclosure {
  scheme: string
  revealableFields: string[]
}

export interface Receipt {
  receiptId: string
  recommendationId: string
  context: string[]
  type: string[]
  issuer: string
  issuedAt: string
  subject: ReceiptSubject
  recommendation: ReceiptRecommendation
  contributingFeatures: ContributingFeature[]
  provenance: ReceiptProvenance
  selectiveDisclosure: SelectiveDisclosure
  governanceBadges: string[]
}

export interface AuditTimelineEntry {
  time: string
  event: string
  receiptId: string
}

// ============================================================================
// Act 5 — federation
// ============================================================================

export interface FederatedOrganizer {
  id: string
  label: string
  sector: string
  epsilon: number
  status: 'contributing' | 'flagged-outlier'
  reputation: number
  self?: boolean
}

export interface MetaDetectorState {
  reputationScore: string
  gradientOutlier: string
  byzantineRobust: string
  challengeRound: string
}

export interface GlobalModelDelta {
  brierBefore: number
  brierAfter: number
  deltaPct: number
}

export interface ProvenanceManifest {
  aggregationScheme: string
  dpTotal: number
  contributorCount: number
  individualContributionsVisible: boolean
}

export interface RoundSummary {
  roundId: number
  contributingOrganizers: number
  excludedOrganizers: string[]
  metaDetectorState: MetaDetectorState
  globalModelDelta: GlobalModelDelta
  rarePatternSurfaced: string
  provenanceManifest: ProvenanceManifest
}

export interface BrierPoint {
  round: number
  brier: number
}

// ============================================================================
// Act 6 — substitution / drift
// ============================================================================

export interface Cancellation {
  cancelledSpeakerId: string
  cancelledName: string
  cancelledSlot: number
  cancelledSession: string
  timeToEventHours: number
  reason: string
}

export interface SubstituteCandidate {
  speakerId: string
  name: string
  headline: string
  forecastP: number
  ci: [number, number]
  deltaEngagement: number
  deltaSponsor: number
  deltaPersona: number
  availability: string
  recommendation: string
}

export interface DriftStatus {
  currentBrier: number
  baselineBrier: number
  trend: string
  driftThreshold: number
  retrainQueued: boolean
  canaryRoundId: string
  promotionEta: string
  modelVersionCurrent: string
  modelVersionCandidate: string
}

// ============================================================================
// Act 8 — deep dives
// ============================================================================

export interface TrendTopic {
  topic: string
  d1: number
  d2: number
  eventDateForecast: number
  classification: 'accelerating' | 'saturating' | 'rotating away'
  highlight?: boolean
}

export interface SyntheticSubmission {
  candidateName: string
  bio: string
  textProb: number
  imageProb: number
  fusedProb: number
  flags: string[]
  decision: string
}

export interface PromptInjectionExample {
  field: string
  text: string
  flagged: boolean
  classifierScore: number
  action: string
}

export interface PolicyDiagnostic {
  severity: 'FAIL' | 'WARN'
  rule: string
  citation: string
  fix: string
}

export interface PolicyValidatorRun {
  policyYaml: string
  diagnostics: PolicyDiagnostic[]
}

export interface ExplanationVariant {
  headline: string
  body: string
  actions: string[]
}

export type ExplanationAudience = 'candidateFacing' | 'organizerFacing' | 'regulatorFacing'

export interface FailureModeTier {
  tier: number
  name: string
  status: 'HEALTHY' | 'STANDBY'
  latencyMs: number | 'N/A'
  description: string
}

export interface DidSpeakCredential {
  type: string[]
  subject: { speakerId: string, speakerName: string }
  event: string
  session: string
  date: string
  durationMinutes: number
  startSignal: string
  endSignal: string
  selectiveDisclosure: string
  presentableTo: string[]
  hsmSignature: string
}

export interface CrossBorderRePolicy {
  originalVenue: string
  newVenue: string
  triggerTime: string
  detectedChanges: string[]
  policyUpdates: string[]
  affectedSubjects: { speakers: number, sponsors: number, attendees: number }
  notificationSent: boolean
}

// ============================================================================
// Stepper / act registry
// ============================================================================

export interface EncoreAct {
  id: string
  num: number
  name: string
  patent: string | null
}
