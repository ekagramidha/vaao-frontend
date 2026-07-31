/**
 * Types mirroring the optimizer API's response bodies.
 *
 * Hand-written rather than generated: the backend is the only consumer-facing
 * contract and keeping this file small and readable is worth more here than the
 * machinery of a codegen step. Anything that diverges shows up immediately as a
 * type error in a view.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type IssueCategory =
  | 'missed_qualification'
  | 'objection_handling'
  | 'tone_and_brand'
  | 'booking_flow'
  | 'weak_follow_up'
  | 'policy_violation'
  | 'data_capture'
  | 'action_execution'
  | 'knowledge_gap'
  | 'language_support'
  | 'escalation_handling'
  | 'conversation_control';

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type Applicability = 'applicable' | 'advisory_only';
export type RecommendationStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'applied'
  | 'rolled_back'
  | 'superseded';

/* Envelopes ---------------------------------------------------------------- */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  source?: 'ghl' | 'cache';
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}

/* Domain ------------------------------------------------------------------- */

export interface AgentAction {
  id: string;
  actionType: string;
  name: string;
  actionParameters: Record<string, unknown>;
}

export interface Agent {
  id: string;
  ghlAgentId: string;
  locationId: string;
  agentName: string;
  businessName: string;
  welcomeMessage: string;
  agentPrompt: string;
  language?: string;
  responsiveness: number;
  maxCallDuration: number;
  sendUserIdleReminders: boolean;
  reminderAfterIdleTimeSeconds: number;
  toolCallStrictMode: boolean;
  timezone: string;
  translation: { enabled: boolean; language?: string };
  actions: AgentAction[];
  currentVersion: number;
  syncedAt: string;
}

export interface TranscriptTurn {
  index: number;
  speaker: 'agent' | 'customer';
  text: string;
  interrupted: boolean;
  continuesPrevious: boolean;
}

export interface TranscriptStats {
  totalTurns: number;
  agentTurns: number;
  customerTurns: number;
  agentWords: number;
  customerWords: number;
  talkRatio: number;
  averageAgentWordsPerTurn: number;
  interruptionCount: number;
}

export interface Call {
  id: string;
  ghlCallId: string;
  ghlAgentId: string;
  startedAt: string;
  durationSeconds: number;
  summary: string;
  turns: TranscriptTurn[];
  stats: TranscriptStats;
  agentTransferOccurred: boolean;
  extractedData: Record<string, unknown>;
  executedCallActions: unknown[];
  trialCall: boolean;
  /** True for locally generated development transcripts. Badged in the UI. */
  isSeeded: boolean;
}

export interface CallOutcome {
  callId: string;
  outcome: 'success' | 'partial' | 'failure';
  score: number;
  reasoning: string;
  missedOpportunities: string[];
}

export interface Analysis {
  id: string;
  ghlAgentId: string;
  agentVersion: number;
  callIds: string[];
  status: RunStatus;
  goalStatement: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  callOutcomes: CallOutcome[];
  issueCount: number;
  error?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Evidence {
  callId: string;
  turnIndex: number;
  quote: string;
}

export interface Issue {
  id: string;
  ghlAgentId: string;
  analysisId: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  frequency: { affectedCalls: number; totalCalls: number; rate: number };
  evidence: Evidence[];
  suggestedDirection: string;
  status: 'open' | 'addressed' | 'dismissed';
  createdAt: string;
}

export interface SuccessCriterion {
  key: string;
  type: string;
  label: string;
  description: string;
  weight: number;
  mustPass: boolean;
}

export interface CallerPersona {
  name: string;
  role: string;
  mood: string;
  goal: string;
  behaviours: string[];
  openingLine: string;
}

/**
 * A verdict from a human who ran this scenario against the real agent.
 *
 * The only outcome in the product that came from HighLevel's own runtime
 * rather than from a text simulation.
 */
export interface ManualRun {
  verdict: 'passed' | 'failed';
  note: string;
  recordedAt: string;
}

export interface TestCase {
  id: string;
  ghlAgentId: string;
  title: string;
  type: 'happy_path' | 'edge_case';
  scenario: string;
  callerPersona: CallerPersona;
  successCriteria: SuccessCriterion[];
  derivedFromIssueIds: string[];
  /** Analysis the case was written from. Absent when generated without one. */
  sourceAnalysisId?: string;
  maxTurns: number;
  status: 'active' | 'archived';
  manualRun?: ManualRun;
  createdAt: string;
}

export interface TestRun {
  id: string;
  ghlAgentId: string;
  agentVersion: number;
  purpose: 'baseline' | 'verification' | 'ad_hoc';
  status: RunStatus;
  totals: { total: number; passed: number; failed: number; errored: number };
  score: number;
  comparisonRunId?: string;
  error?: string;
  completedAt?: string;
  createdAt: string;
}

export interface CriterionResult {
  key: string;
  type: string;
  label: string;
  weight: number;
  mustPass: boolean;
  passed: boolean;
  confidence: number;
  reasoning: string;
  evidenceTurnIndex?: number;
}

export interface TestResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  testCaseTitle: string;
  status: 'passed' | 'failed' | 'errored';
  score: number;
  simulatedTurns: TranscriptTurn[];
  criterionResults: CriterionResult[];
  failureModes: string[];
  judgeSummary: string;
  error?: string;
}

export interface IssueDelta {
  fingerprint: string;
  title: string;
  category: IssueCategory;
  severity: Severity;
  /** 0-1 share of calls affected in the earlier analysis. Null if new. */
  previousRate: number | null;
  /** 0-1 share of calls affected now. Null if it did not recur. */
  currentRate: number | null;
}

/**
 * Issue-level diff between two analyses of real calls.
 *
 * This is the product's only measurement of the real agent on the real
 * platform. Everything in a test run is simulated.
 */
export interface AnalysisComparison {
  previousAnalysisId: string;
  previousCompletedAt: string | null;
  previousCallCount: number;
  currentCallCount: number;
  resolved: IssueDelta[];
  persisting: IssueDelta[];
  introduced: IssueDelta[];
  freshCallCount: number;
  sharedCallCount: number;
  /** No new calls since the last analysis, so nothing here measures a fix. */
  readsOnlyOldCalls: boolean;
  changesBetween: Array<{ version: number; note?: string; createdAt: string }>;
}

export interface PromptEdit {
  operation: 'replace' | 'insert_after' | 'append';
  anchor: string;
  snippet: string;
}

export interface ProposedChange {
  field: string;
  before: unknown;
  after: unknown;
  changeSummary: string[];
  /**
   * Anchored edits behind an `agentPrompt` change. Present so the diff can be
   * recomputed against the live prompt at apply time — which is why `before`
   * and `after` here may be restated after a preview.
   */
  promptEdits?: PromptEdit[];
}

export interface Recommendation {
  id: string;
  ghlAgentId: string;
  analysisId?: string;
  testRunId?: string;
  type: string;
  applicability: Applicability;
  /** Why it cannot be applied automatically. Rendered next to the badge. */
  advisoryReason?: string;
  title: string;
  rationale: string;
  expectedImpact: string;
  priority: Severity;
  confidence: number;
  change: ProposedChange;
  linkedIssueIds: string[];
  linkedCriterionKeys: string[];
  status: RecommendationStatus;
  appliedVersion?: number;
  appliedAt?: string;
  createdAt: string;
}

export interface AgentVersion {
  id: string;
  version: number;
  source: 'ghl_sync' | 'optimizer_apply' | 'rollback';
  changedFields: string[];
  appliedRecommendationIds: string[];
  restoredFromVersion?: number;
  note?: string;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Job {
  id: string;
  ghlAgentId: string;
  type: 'transcript_analysis' | 'test_generation' | 'test_run' | 'recommendation_synthesis';
  status: JobStatus;
  progress: { current: number; total: number; message: string };
  result?: { kind: 'analysis' | 'testCases' | 'testRun' | 'recommendations'; id: string };
  error?: string;
  createdAt: string;
}

export interface AgentOverview {
  agent: {
    id: string;
    name: string;
    businessName: string;
    version: number;
    actionCount: number;
    syncedAt: string;
  };
  calls: { total: number; seeded: number; latestAt: string | null };
  analysis: {
    id: string;
    score: number;
    goalStatement: string;
    summary: string;
    completedAt: string | null;
  } | null;
  issues: { open: number; bySeverity: Record<Severity, number> };
  testing: {
    activeCases: number;
  };
  recommendations: { proposed: number; applicable: number; advisory: number; applied: number };
}

export interface ApplyResult {
  recommendation: Recommendation;
  payload: Record<string, unknown>;
  version?: number;
  dryRun: boolean;
}

export interface RollbackResult {
  version: number;
  restoredFields: string[];
  unrestoredFields: string[];
}
