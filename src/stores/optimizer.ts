import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, ApiClientError } from '@/services/api';
import type {
  Analysis,
  AnalysisComparison,
  ApplyResult,
  Call,
  Issue,
  Recommendation,
  RollbackResult,
  TestCase,
  TestResult,
  TestRun,
} from '@/types/api';

/**
 * The three optimizer loops in one store.
 *
 * Kept together rather than split per loop because they are one workflow:
 * analysis produces the issues that test generation consumes, and both feed the
 * recommender. A change in any of them invalidates the others, and having a
 * single `refreshAll` is what keeps the UI honest after an apply.
 */
export const useOptimizerStore = defineStore('optimizer', () => {
  /* Loop 1 */
  const analyses = ref<Analysis[]>([]);
  const issues = ref<Issue[]>([]);
  /** Issue-level diff against the previous analysis. Null on a first run. */
  const comparison = ref<AnalysisComparison | null>(null);

  /* Loop 2 */
  const testCases = ref<TestCase[]>([]);
  const testRuns = ref<TestRun[]>([]);
  const selectedRun = ref<TestRun | null>(null);
  const selectedRunResults = ref<TestResult[]>([]);
  const comparisonRun = ref<TestRun | null>(null);
  const comparisonScores = ref<Map<string, number>>(new Map());

  /* Loop 3 */
  const recommendations = ref<Recommendation[]>([]);

  const calls = ref<Call[]>([]);
  const error = ref<string | null>(null);
  const busy = ref<string | null>(null);

  const latestAnalysis = computed(
    () => analyses.value.find((analysis) => analysis.status === 'completed') ?? null,
  );

  const openIssues = computed(() => issues.value.filter((issue) => issue.status === 'open'));

  const proposedRecommendations = computed(() =>
    recommendations.value.filter((item) => item.status === 'proposed'),
  );

  const appliedRecommendations = computed(() =>
    recommendations.value.filter((item) => item.status === 'applied'),
  );

  /**
   * Issues indexed by id, so a recommendation can name the evidence that
   * justifies it without every card re-scanning the array.
   */
  const issuesById = computed(() => new Map(issues.value.map((issue) => [issue.id, issue])));

  function capture(caught: unknown, fallback: string): void {
    error.value = caught instanceof Error ? caught.message : fallback;
  }

  /* Loads ------------------------------------------------------------------ */

  async function loadAnalyses(agentId: string): Promise<void> {
    try {
      const { data } = await api.listAnalyses(agentId);
      analyses.value = data;
    } catch (caught) {
      capture(caught, 'Could not load analyses.');
    }
  }

  async function loadIssues(agentId: string): Promise<void> {
    try {
      const { data } = await api.listIssues(agentId);
      issues.value = data;
    } catch (caught) {
      capture(caught, 'Could not load issues.');
    }
  }

  /**
   * Loads the regression diff for the newest completed analysis.
   *
   * Depends on `analyses` already being loaded, so it is sequenced after
   * `loadAnalyses` rather than run alongside it.
   */
  async function loadComparison(): Promise<void> {
    const latest = analyses.value.find((analysis) => analysis.status === 'completed');
    if (!latest) {
      comparison.value = null;
      return;
    }
    try {
      const { data } = await api.getAnalysisComparison(latest.id);
      comparison.value = data;
    } catch (caught) {
      capture(caught, 'Could not compare with the previous analysis.');
    }
  }

  async function loadTestCases(agentId: string): Promise<void> {
    try {
      const { data } = await api.listTestCases(agentId);
      testCases.value = data;
    } catch (caught) {
      capture(caught, 'Could not load test cases.');
    }
  }

  async function loadTestRuns(agentId: string): Promise<void> {
    try {
      const { data } = await api.listTestRuns(agentId);
      testRuns.value = data;
    } catch (caught) {
      capture(caught, 'Could not load test runs.');
    }
  }

  /** Loads one run plus the run it is measured against, for the delta view. */
  async function loadRun(testRunId: string): Promise<void> {
    try {
      const { data } = await api.getTestRun(testRunId);
      selectedRun.value = data.run;
      selectedRunResults.value = data.results;
      comparisonRun.value = data.comparison;
      comparisonScores.value = new Map(
        data.comparisonResults.map((result) => [result.testCaseId, result.score]),
      );
    } catch (caught) {
      capture(caught, 'Could not load the test run.');
    }
  }

  async function loadRecommendations(agentId: string): Promise<void> {
    try {
      const { data } = await api.listRecommendations(agentId);
      recommendations.value = data;
    } catch (caught) {
      capture(caught, 'Could not load recommendations.');
    }
  }

  async function loadCalls(agentId: string): Promise<void> {
    try {
      const { data } = await api.listCalls(agentId, 1, 50);
      calls.value = data;
    } catch (caught) {
      capture(caught, 'Could not load calls.');
    }
  }

  /** Everything the agent workspace needs, in parallel. */
  async function loadAll(agentId: string): Promise<void> {
    error.value = null;
    await Promise.all([
      loadAnalyses(agentId).then(loadComparison),
      loadIssues(agentId),
      loadTestCases(agentId),
      loadTestRuns(agentId),
      loadRecommendations(agentId),
      loadCalls(agentId),
    ]);
  }

  function clear(): void {
    analyses.value = [];
    issues.value = [];
    comparison.value = null;
    testCases.value = [];
    testRuns.value = [];
    recommendations.value = [];
    calls.value = [];
    selectedRun.value = null;
    selectedRunResults.value = [];
    comparisonRun.value = null;
    comparisonScores.value = new Map();
    error.value = null;
  }

  /* Mutations -------------------------------------------------------------- */

  async function archiveTestCase(agentId: string, testCaseId: string): Promise<void> {
    try {
      await api.archiveTestCase(agentId, testCaseId);
      testCases.value = testCases.value.filter((testCase) => testCase.id !== testCaseId);
    } catch (caught) {
      capture(caught, 'Could not archive the test case.');
    }
  }

  /** Replaces one case in place, so recording a verdict does not refetch the suite. */
  function replaceTestCase(updated: TestCase): void {
    testCases.value = testCases.value.map((testCase) =>
      testCase.id === updated.id ? updated : testCase,
    );
  }

  async function recordManualRun(
    testCaseId: string,
    verdict: 'passed' | 'failed',
    note?: string,
  ): Promise<void> {
    busy.value = testCaseId;
    try {
      const { data } = await api.recordManualRun(testCaseId, verdict, note);
      replaceTestCase(data);
    } catch (caught) {
      capture(caught, 'Could not record the result.');
    } finally {
      busy.value = null;
    }
  }

  async function clearManualRun(testCaseId: string): Promise<void> {
    busy.value = testCaseId;
    try {
      const { data } = await api.clearManualRun(testCaseId);
      replaceTestCase(data);
    } catch (caught) {
      capture(caught, 'Could not clear the result.');
    } finally {
      busy.value = null;
    }
  }

  /**
   * Resolves what would actually be written, without writing it.
   *
   * This is not cosmetic. A prompt recommendation is stored as anchored edits
   * plus a snapshot of the prompt at generation time, and the server recomputes
   * the result against the live prompt on apply. So once any other prompt
   * change has landed, the stored diff is out of date and the preview is the
   * only accurate view of what the user is about to approve. It also surfaces
   * an anchor that no longer resolves before the write rather than after it.
   */
  async function previewRecommendation(
    agentId: string,
    recommendationId: string,
  ): Promise<{ result: ApplyResult | null; error: string | null }> {
    try {
      const { data } = await api.previewRecommendation(agentId, recommendationId);
      return { result: data, error: null };
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Could not preview the recommendation.';
      return { result: null, error: message };
    }
  }

  /**
   * Writes a recommendation back to HighLevel.
   *
   * Returns the result rather than only mutating state, because the caller
   * needs the new version number to offer "verify with a test run" as the
   * immediate next step — which is what closes the loop.
   */
  async function applyRecommendation(
    agentId: string,
    recommendationId: string,
  ): Promise<ApplyResult | null> {
    busy.value = recommendationId;
    error.value = null;
    try {
      const { data } = await api.applyRecommendation(agentId, recommendationId);
      await Promise.all([loadRecommendations(agentId), loadIssues(agentId)]);
      return data;
    } catch (caught) {
      // A conflict means the agent moved under us, which needs a different
      // message from a generic failure: the user must re-analyse, not retry.
      if (caught instanceof ApiClientError && caught.status === 409) {
        error.value = caught.message;
      } else {
        capture(caught, 'Could not apply the recommendation.');
      }
      return null;
    } finally {
      busy.value = null;
    }
  }

  /**
   * Undoes an applied change by restoring the version beneath it.
   *
   * The server refuses when later changes are stacked on top, and that refusal
   * names them — so it is surfaced verbatim rather than replaced with a generic
   * failure message, because it tells the user what to do instead.
   */
  async function revertRecommendation(
    agentId: string,
    recommendationId: string,
  ): Promise<RollbackResult | null> {
    busy.value = recommendationId;
    error.value = null;
    try {
      const { data } = await api.revertRecommendation(agentId, recommendationId);
      await Promise.all([loadRecommendations(agentId), loadIssues(agentId)]);
      return data;
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        error.value = caught.message;
      } else {
        capture(caught, 'Could not revert the change.');
      }
      return null;
    } finally {
      busy.value = null;
    }
  }

  /** Undo for a dismissal. Never touches HighLevel — it is a review decision. */
  async function restoreRecommendation(agentId: string, recommendationId: string): Promise<void> {
    busy.value = recommendationId;
    try {
      await api.restoreRecommendation(agentId, recommendationId);
      await loadRecommendations(agentId);
    } catch (caught) {
      capture(caught, 'Could not restore the recommendation.');
    } finally {
      busy.value = null;
    }
  }

  async function rejectRecommendation(
    agentId: string,
    recommendationId: string,
    reason?: string,
  ): Promise<void> {
    busy.value = recommendationId;
    try {
      await api.rejectRecommendation(agentId, recommendationId, reason);
      await loadRecommendations(agentId);
    } catch (caught) {
      capture(caught, 'Could not dismiss the recommendation.');
    } finally {
      busy.value = null;
    }
  }

  return {
    analyses,
    issues,
    comparison,
    testCases,
    testRuns,
    selectedRun,
    selectedRunResults,
    comparisonRun,
    comparisonScores,
    recommendations,
    calls,
    error,
    busy,
    latestAnalysis,
    openIssues,
    proposedRecommendations,
    appliedRecommendations,
    issuesById,
    loadAnalyses,
    loadComparison,
    loadIssues,
    loadTestCases,
    loadTestRuns,
    loadRun,
    loadRecommendations,
    loadCalls,
    loadAll,
    clear,
    archiveTestCase,
    recordManualRun,
    clearManualRun,
    previewRecommendation,
    applyRecommendation,
    rejectRecommendation,
    restoreRecommendation,
    revertRecommendation,
  };
});
