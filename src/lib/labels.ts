import type { IssueCategory, RecommendationStatus, Severity } from '@/types/api';

/**
 * Human-readable labels for the domain's slugs.
 *
 * The API speaks in `lower_snake_case` because those values are stable
 * identifiers. The UI should not: "Contact data not captured" tells a business
 * owner what went wrong, `data_capture` asks them to decode it.
 *
 * Kept in one file so wording is consistent wherever a value appears — the
 * same category shows up on an issue card, a recommendation's evidence trail
 * and a filter, and they should not disagree.
 */

/** Falls back to a readable form of the slug when a value is not mapped. */
export function titleCase(slug: string): string {
  const spaced = slug.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelFrom<T extends string>(map: Partial<Record<T, string>>, key: T): string {
  return map[key] ?? titleCase(key);
}

const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  missed_qualification: 'Missed qualification question',
  objection_handling: 'Poor objection handling',
  tone_and_brand: 'Off-brand or incorrect tone',
  booking_flow: 'Incomplete booking flow',
  weak_follow_up: 'Weak follow-up',
  policy_violation: 'Policy violation',
  data_capture: 'Contact data not captured',
  action_execution: 'Action failed or never fired',
  knowledge_gap: 'Unanswered or invented knowledge',
  language_support: 'Unsupported language request',
  escalation_handling: 'Escalation mishandled',
  conversation_control: 'Interruptions and turn-taking',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Recommendation types, named after the setting a user would recognise.
 *
 * `responsiveness` is deliberately labelled "Patience level": that is what the
 * HighLevel UI calls the same control, and showing our internal name would
 * send someone hunting for a field that does not exist there.
 */
const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  welcome_message: 'Welcome message',
  responsiveness: 'Patience level',
  max_call_duration: 'Max call duration',
  idle_reminder: 'Idle reminder',
  tool_strict_mode: 'Strict tool calls',
  language: 'Language',
  translation: 'Translation',
  guardrail: 'Guardrail',
  escalation_rule: 'Escalation rule',
  action_config: 'Action configuration',
  knowledge_base: 'Knowledge base',
  temperature: 'Temperature',
  model: 'Model',
};

const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  rejected: 'Dismissed',
  applied: 'Applied',
  rolled_back: 'Rolled back',
  superseded: 'Superseded',
};

const CRITERION_TYPE_LABELS: Record<string, string> = {
  contact_capture: 'Contact capture',
  booking_flow: 'Booking flow',
  brand_tone: 'Brand tone',
  interruption_handling: 'Interruptions',
  objection_handling: 'Objections',
  claim_accuracy: 'Claim accuracy',
  action_execution: 'Action execution',
  escalation: 'Escalation',
  policy_compliance: 'Policy compliance',
  custom: 'Custom',
};

const TEST_CASE_TYPE_LABELS: Record<string, string> = {
  happy_path: 'Happy path',
  edge_case: 'Edge case',
};

const RUN_PURPOSE_LABELS: Record<string, string> = {
  baseline: 'Baseline',
  verification: 'Verification',
  ad_hoc: 'Ad hoc',
};

const RESULT_STATUS_LABELS: Record<string, string> = {
  passed: 'Passed',
  failed: 'Failed',
  errored: 'Errored',
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  addressed: 'Addressed',
  dismissed: 'Dismissed',
};

export const issueCategoryLabel = (key: IssueCategory): string =>
  labelFrom(ISSUE_CATEGORY_LABELS, key);
export const severityLabel = (key: Severity): string => labelFrom(SEVERITY_LABELS, key);
export const recommendationTypeLabel = (key: string): string =>
  labelFrom(RECOMMENDATION_TYPE_LABELS, key);
export const recommendationStatusLabel = (key: RecommendationStatus): string =>
  labelFrom(RECOMMENDATION_STATUS_LABELS, key);
export const criterionTypeLabel = (key: string): string => labelFrom(CRITERION_TYPE_LABELS, key);
export const testCaseTypeLabel = (key: string): string => labelFrom(TEST_CASE_TYPE_LABELS, key);
export const runPurposeLabel = (key: string): string => labelFrom(RUN_PURPOSE_LABELS, key);
export const resultStatusLabel = (key: string): string => labelFrom(RESULT_STATUS_LABELS, key);
export const issueStatusLabel = (key: string): string => labelFrom(ISSUE_STATUS_LABELS, key);

/**
 * Criterion keys and failure modes are model-generated slugs with no fixed
 * vocabulary, so they get sentence-cased rather than looked up.
 */
export const slugLabel = titleCase;

/** Field paths shown on a recommendation, e.g. `agentPrompt` → "Agent prompt". */
export function fieldLabel(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
