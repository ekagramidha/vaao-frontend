import { request, type ApiResult } from './client';
import type {
  Agent,
  AgentOverview,
  AgentVersion,
  Analysis,
  AnalysisComparison,
  ApplyResult,
  Call,
  Issue,
  Job,
  Recommendation,
  RollbackResult,
  TestCase,
  TestResult,
  TestRun,
} from '@/types/api';

/**
 * Typed bindings for every endpoint, grouped by the loop they belong to.
 *
 * One function per endpoint, no logic. Stores compose these; components call
 * stores. Nothing in the UI builds a URL.
 */

export const api = {
  health: () => request<{ status: string; ghl: { dataSourceMode: string } }>('/health'),

  /* Agents ---------------------------------------------------------------- */

  listAgents: () => request<Agent[]>('/agents'),
  syncAgents: () => request<Agent[]>('/agents/sync', { method: 'POST' }),
  getAgent: (agentId: string) => request<Agent>(`/agents/${agentId}`),
  getOverview: (agentId: string) => request<AgentOverview>(`/agents/${agentId}/overview`),

  listCalls: (agentId: string, page = 1, pageSize = 20) =>
    request<Call[]>(`/agents/${agentId}/calls`, { query: { page, pageSize } }),
  getCall: (agentId: string, callId: string) =>
    request<Call>(`/agents/${agentId}/calls/${callId}`),

  listVersions: (agentId: string) => request<AgentVersion[]>(`/agents/${agentId}/versions`),
  rollback: (agentId: string, version: number) =>
    request<RollbackResult>(`/agents/${agentId}/rollback`, { method: 'POST', body: { version } }),

  /* Loop 1 — analyse past performance ------------------------------------ */

  startAnalysis: (agentId: string, callLimit: number = 25) =>
    request<Job>(`/agents/${agentId}/analyses`, {
      method: 'POST',
      body: { callLimit },
    }),
  listAnalyses: (agentId: string) => request<Analysis[]>(`/agents/${agentId}/analyses`),
  getAnalysis: (analysisId: string) =>
    request<{ analysis: Analysis; issues: Issue[] }>(`/analyses/${analysisId}`),
  /** Null when this is the first analysis for the agent. */
  getAnalysisComparison: (analysisId: string) =>
    request<AnalysisComparison | null>(`/analyses/${analysisId}/comparison`),
  listIssues: (agentId: string, status?: 'open' | 'addressed' | 'dismissed') =>
    request<Issue[]>(`/agents/${agentId}/issues`, { query: { status } }),

  /* Loop 2 — generate and run test cases --------------------------------- */

  generateTestCases: (
    agentId: string,
    body: { happyPathCount?: number; edgeCaseCount?: number; replaceExisting?: boolean } = {},
  ) => request<Job>(`/agents/${agentId}/test-cases`, { method: 'POST', body }),
  listTestCases: (agentId: string) => request<TestCase[]>(`/agents/${agentId}/test-cases`),
  archiveTestCase: (agentId: string, testCaseId: string) =>
    request<TestCase>(`/agents/${agentId}/test-cases/${testCaseId}`, { method: 'DELETE' }),
  /** Records what happened when a person ran this scenario on the real agent. */
  recordManualRun: (testCaseId: string, verdict: 'passed' | 'failed', note?: string) =>
    request<TestCase>(`/test-cases/${testCaseId}/manual-run`, {
      method: 'PUT',
      body: { verdict, ...(note ? { note } : {}) },
    }),
  clearManualRun: (testCaseId: string) =>
    request<TestCase>(`/test-cases/${testCaseId}/manual-run`, { method: 'DELETE' }),

  startTestRun: (
    agentId: string,
    body: {
      testCaseIds?: string[];
      purpose?: 'baseline' | 'verification' | 'ad_hoc';
      comparisonRunId?: string;
      triggeringRecommendationIds?: string[];
    } = {},
  ) => request<Job>(`/agents/${agentId}/test-runs`, { method: 'POST', body }),
  listTestRuns: (agentId: string) => request<TestRun[]>(`/agents/${agentId}/test-runs`),
  getTestRun: (testRunId: string) =>
    request<{
      run: TestRun;
      results: TestResult[];
      comparison: TestRun | null;
      comparisonResults: Array<Pick<TestResult, 'id' | 'testCaseId' | 'score' | 'status'>>;
    }>(`/test-runs/${testRunId}`),

  /* Loop 3 — recommend, apply, roll back --------------------------------- */

  generateRecommendations: (agentId: string, body: { replaceExisting?: boolean } = {}) =>
    request<Job>(`/agents/${agentId}/recommendations`, { method: 'POST', body }),
  listRecommendations: (agentId: string) =>
    request<Recommendation[]>(`/agents/${agentId}/recommendations`),
  previewRecommendation: (agentId: string, recommendationId: string) =>
    request<ApplyResult>(`/agents/${agentId}/recommendations/${recommendationId}/preview`),
  applyRecommendation: (agentId: string, recommendationId: string) =>
    request<ApplyResult>(`/agents/${agentId}/recommendations/${recommendationId}/apply`, {
      method: 'POST',
    }),
  rejectRecommendation: (agentId: string, recommendationId: string, reason?: string) =>
    request<Recommendation>(`/agents/${agentId}/recommendations/${recommendationId}/reject`, {
      method: 'POST',
      body: reason ? { reason } : {},
    }),
  restoreRecommendation: (agentId: string, recommendationId: string) =>
    request<Recommendation>(`/agents/${agentId}/recommendations/${recommendationId}/restore`, {
      method: 'POST',
    }),
  /** Undoes an applied change. 409s when later changes sit on top of it. */
  revertRecommendation: (agentId: string, recommendationId: string) =>
    request<RollbackResult>(`/agents/${agentId}/recommendations/${recommendationId}/revert`, {
      method: 'POST',
    }),

  /* Jobs ------------------------------------------------------------------ */

  getJob: (jobId: string) => request<Job>(`/jobs/${jobId}`),
  listJobs: (agentId: string) => request<Job[]>(`/agents/${agentId}/jobs`),
};

export type { ApiResult };
export { ApiClientError } from './client';
