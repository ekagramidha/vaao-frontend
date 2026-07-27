<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertCircle,
  ChevronLeft,
  ClipboardList,
  FlaskConical,
  History,
  Lightbulb,
  ListChecks,
  PlayCircle,
  Sparkles,
  Waves,
} from 'lucide-vue-next';
import EmptyState from '@/components/EmptyState.vue';
import IssueCard from '@/components/IssueCard.vue';
import JobProgress from '@/components/JobProgress.vue';
import LoopStepper, { type LoopStep, type StepState } from '@/components/LoopStepper.vue';
import PromptDiff from '@/components/PromptDiff.vue';
import RecommendationCard from '@/components/RecommendationCard.vue';
import RegressionSummary from '@/components/RegressionSummary.vue';
import ScoreStat from '@/components/ScoreStat.vue';
import SimulationNotice from '@/components/SimulationNotice.vue';
import TestCaseCard from '@/components/TestCaseCard.vue';
import TranscriptViewer from '@/components/TranscriptViewer.vue';
import VersionTimeline from '@/components/VersionTimeline.vue';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CollapsibleSection,
  Dialog,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useJobRunner } from '@/composables/useJobRunner';
import { formatDuration, formatRelative, pluralise } from '@/lib/format';
import { recommendationStatusLabel, runPurposeLabel, titleCase } from '@/lib/labels';
import { api } from '@/services/api';
import { useAgentsStore } from '@/stores/agents';
import { useOptimizerStore } from '@/stores/optimizer';
import type { ApplyResult, Call, Recommendation, RecommendationStatus } from '@/types/api';

/**
 * The agent workspace: all three optimizer loops on one screen.
 *
 * Tabs rather than separate pages because the loops are read together — you
 * judge a recommendation by the issue that motivated it and the test that
 * failed, and making that a navigation step would break the argument the UI is
 * trying to make.
 */
const props = defineProps<{ agentId: string }>();

const agentsStore = useAgentsStore();
const optimizerStore = useOptimizerStore();
const router = useRouter();

const activeTab = ref('performance');
const openCall = ref<Call | null>(null);
const notice = ref<string | null>(null);

const agent = computed(
  () => agentsStore.agents.find((item) => item.ghlAgentId === props.agentId) ?? null,
);
const overview = computed(() => agentsStore.overview);

/* Job runners — one per loop, each refreshing exactly what it produced ------ */

const analysisJob = useJobRunner({
  onSuccess: async () => {
    await Promise.all([
      // The comparison is against whichever analysis is newest, so it has to be
      // sequenced after the list reloads rather than fetched alongside it.
      optimizerStore.loadAnalyses(props.agentId).then(optimizerStore.loadComparison),
      optimizerStore.loadIssues(props.agentId),
      agentsStore.loadOverview(props.agentId),
    ]);
    notice.value = 'Analysis complete. Review the issues, then generate a test suite.';
  },
});

const testGenJob = useJobRunner({
  onSuccess: async () => {
    await Promise.all([
      optimizerStore.loadTestCases(props.agentId),
      agentsStore.loadOverview(props.agentId),
    ]);
    activeTab.value = 'tests';
    notice.value = 'Test suite generated. Run it to score the agent as it is configured today.';
  },
});

const testRunJob = useJobRunner({
  onSuccess: async (job) => {
    await Promise.all([
      optimizerStore.loadTestRuns(props.agentId),
      agentsStore.loadOverview(props.agentId),
    ]);
    if (job.result?.kind === 'testRun') {
      await router.push({
        name: 'test-run',
        params: { agentId: props.agentId, testRunId: job.result.id },
      });
    }
  },
});

const recommendJob = useJobRunner({
  onSuccess: async () => {
    await Promise.all([
      optimizerStore.loadRecommendations(props.agentId),
      agentsStore.loadOverview(props.agentId),
    ]);
    activeTab.value = 'recommendations';
  },
});

/**
 * Stable list for rendering progress bars.
 *
 * Named rather than built inline in the template so each bar keeps a constant
 * key across renders — a changing key would tear down and rebuild the bar on
 * every poll.
 */
const jobRunners = [
  { key: 'analysis', runner: analysisJob },
  { key: 'test-generation', runner: testGenJob },
  { key: 'test-run', runner: testRunJob },
  { key: 'recommendations', runner: recommendJob },
] as const;

const anyJobRunning = computed(() =>
  jobRunners.some(({ runner }) => runner.isRunning.value),
);

/* The loop stepper ---------------------------------------------------------
 *
 * Each step reports whether it has been run and whether that result is still
 * valid. Staleness is derived entirely from data the API already returns, and
 * the version comparison on the test run is the one that matters most: after an
 * apply, the last score describes the configuration that was replaced.
 */

const timeOf = (value: string | null | undefined): number =>
  value ? new Date(value).getTime() : 0;

/** True when transcripts arrived, or the config changed, after the analysis ran. */
const analysisStale = computed(() => {
  const analysis = optimizerStore.latestAnalysis;
  if (!analysis) return false;
  if (agent.value && analysis.agentVersion !== agent.value.currentVersion) return true;
  return timeOf(overview.value?.calls.latestAt) > timeOf(analysis.completedAt);
});

/** True when the suite predates the newest analysis, so it misses its findings. */
const testCasesStale = computed(() => {
  const analysis = optimizerStore.latestAnalysis;
  if (!analysis || optimizerStore.testCases.length === 0) return false;
  return optimizerStore.testCases.every((testCase) => testCase.sourceAnalysisId !== analysis.id);
});

/**
 * True when the last run scored a configuration that is no longer live, or when
 * cases have been added since it ran.
 */
const runStale = computed(() => {
  const run = latestRun.value;
  if (!run) return false;
  if (agent.value && run.agentVersion !== agent.value.currentVersion) return true;
  return optimizerStore.testCases.some(
    (testCase) => timeOf(testCase.createdAt) > timeOf(run.createdAt),
  );
});

/** True when a newer run exists than the newest proposal accounts for. */
const recommendationsStale = computed(() => {
  const newest = optimizerStore.recommendations[0];
  if (!newest) return false;
  if (optimizerStore.proposedRecommendations.length === 0) return true;
  return timeOf(latestRun.value?.completedAt) > timeOf(newest.createdAt);
});

function stateFor(
  hasRun: boolean,
  isStale: boolean,
  lockedReason: string | null,
): StepState {
  if (lockedReason) return 'locked';
  if (!hasRun) return 'pending';
  return isStale ? 'stale' : 'done';
}

const loopSteps = computed<LoopStep[]>(() => {
  const analysis = optimizerStore.latestAnalysis;
  const run = latestRun.value;
  const noCalls = (overview.value?.calls.total ?? 0) === 0;

  const steps: LoopStep[] = [
    {
      key: 'analysis',
      label: 'Analyse transcripts',
      icon: ClipboardList,
      state: stateFor(
        Boolean(analysis),
        analysisStale.value,
        noCalls ? 'No call transcripts to read yet' : null,
      ),
      detail: !analysis
        ? noCalls
          ? 'No call transcripts to read yet'
          : `${pluralise(overview.value?.calls.total ?? 0, 'transcript')} ready to read`
        : analysisStale.value
          ? 'New calls or a config change since this ran'
          : `${pluralise(optimizerStore.issues.length, 'issue')} found ${formatRelative(analysis.completedAt)}`,
      isNext: false,
      busy: analysisJob.isRunning.value,
    },
    {
      key: 'test-generation',
      label: 'Generate tests',
      icon: FlaskConical,
      // Writing the suite and running it are one loop with two actions, so they
      // share a card. They stay separate steps because their staleness differs:
      // a current suite can still hold a score measured two versions ago.
      group: 'testing',
      state: stateFor(
        hasTestCases.value,
        testCasesStale.value,
        analysis ? null : 'Run an analysis first',
      ),
      detail: !analysis
        ? 'Run an analysis first'
        : !hasTestCases.value
          ? 'Write a suite from the agent prompt and its issues'
          : testCasesStale.value
            ? 'Written before the latest analysis'
            : `${pluralise(optimizerStore.testCases.length, 'case')} covering the known issues`,
      isNext: false,
      busy: testGenJob.isRunning.value,
    },
    {
      key: 'test-run',
      label: 'Run suite',
      icon: PlayCircle,
      group: 'testing',
      state: stateFor(
        Boolean(run),
        runStale.value,
        hasTestCases.value ? null : 'Generate a test suite first',
      ),
      detail: !hasTestCases.value
        ? 'Generate a test suite first'
        : !run
          ? 'Score the agent as it is configured today'
          : runStale.value
            ? `Last score measured agent v${run.agentVersion}, now on v${agent.value?.currentVersion}`
            : `Scored ${run.score} on v${run.agentVersion} ${formatRelative(run.completedAt)}`,
      isNext: false,
      busy: testRunJob.isRunning.value,
    },
    {
      key: 'recommendations',
      label: 'Recommend fixes',
      icon: Lightbulb,
      state: stateFor(
        optimizerStore.recommendations.length > 0,
        recommendationsStale.value,
        analysis || run ? null : 'Analyse or run tests first',
      ),
      detail:
        !analysis && !run
          ? 'Analyse or run tests first'
          : optimizerStore.recommendations.length === 0
            ? 'Turn issues and failures into concrete changes'
            : optimizerStore.proposedRecommendations.length === 0
              ? 'All proposals decided — regenerate for fresh ones'
              : `${pluralise(optimizerStore.proposedRecommendations.length, 'proposal')} awaiting review`,
      isNext: false,
      busy: recommendJob.isRunning.value,
    },
  ];

  // Exactly one step is the recommended next action: the earliest that is
  // actionable and not already up to date.
  const next = steps.find((step) => step.state === 'pending' || step.state === 'stale');
  if (next) next.isNext = true;

  return steps;
});

/** Routes a stepper click to the matching job runner. */
async function runStep(key: string): Promise<void> {
  switch (key) {
    case 'analysis':
      await analysisJob.start(() => api.startAnalysis(props.agentId));
      return;
    case 'test-generation':
      await testGenJob.start(() =>
        api.generateTestCases(props.agentId, { replaceExisting: true }),
      );
      return;
    case 'test-run':
      await runSuite();
      return;
    case 'recommendations':
      await recommendJob.start(() => api.generateRecommendations(props.agentId));
      return;
    default:
      return;
  }
}

/* Derived view state ------------------------------------------------------- */

const latestRun = computed(() => optimizerStore.testRuns[0] ?? null);

const hasAnalysis = computed(() => Boolean(optimizerStore.latestAnalysis));
const hasTestCases = computed(() => optimizerStore.testCases.length > 0);

const pendingRecommendations = computed(() => optimizerStore.proposedRecommendations);
const settledRecommendations = computed(() =>
  optimizerStore.recommendations.filter((item) => item.status !== 'proposed'),
);

/** "3 one-click · 1 manual" — how much of the pending set can be applied. */
const pendingSummary = computed(() => {
  const applicable = pendingRecommendations.value.filter(
    (item) => item.applicability === 'applicable',
  ).length;
  const advisory = pendingRecommendations.value.length - applicable;

  return [
    applicable > 0 ? `${applicable} one-click` : null,
    advisory > 0 ? `${advisory} manual` : null,
  ]
    .filter(Boolean)
    .join(' · ');
});

/**
 * "2 applied · 1 dismissed" — the outcome breakdown for the decided set.
 *
 * Worth showing on the collapsed header: it is the whole reason to open the
 * section, and without it a folded group of eight is opaque.
 */
const settledSummary = computed(() => {
  const counts = new Map<RecommendationStatus, number>();
  for (const item of settledRecommendations.value) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => `${count} ${recommendationStatusLabel(status).toLowerCase()}`)
    .join(' · ');
});

/** "1 real · 8 seeded" for the transcript section header. */
const callsSummary = computed(() => {
  const seeded = optimizerStore.calls.filter((call) => call.isSeeded).length;
  const real = optimizerStore.calls.length - seeded;
  return [real > 0 ? `${real} real` : null, seeded > 0 ? `${seeded} seeded` : null]
    .filter(Boolean)
    .join(' · ');
});

/**
 * Whether the open call captured no contact data.
 *
 * Guards against the field being absent rather than empty. A view must not
 * crash because an optional object did not survive the round trip, and reading
 * `Object.keys` off a bare property is exactly how it did.
 */
const capturedNothing = computed(() => {
  const captured = openCall.value?.extractedData;
  return !captured || Object.keys(captured).length === 0;
});

function issuesFor(recommendation: Recommendation) {
  return recommendation.linkedIssueIds
    .map((id) => optimizerStore.issuesById.get(id))
    .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));
}

/* Actions ----------------------------------------------------------------- */

async function load(): Promise<void> {
  if (agentsStore.agents.length === 0) await agentsStore.loadAgents();
  await Promise.all([
    agentsStore.loadOverview(props.agentId),
    agentsStore.loadVersions(props.agentId),
    optimizerStore.loadAll(props.agentId),
  ]);
}

onMounted(load);

// Switching agent via the header re-enters this route with a new prop rather
// than remounting, so the data has to be reloaded explicitly.
watch(
  () => props.agentId,
  async () => {
    optimizerStore.clear();
    notice.value = null;
    activeTab.value = 'performance';
    await load();
  },
);

/* Apply confirmation ------------------------------------------------------- */

/**
 * Apply is a two-step: preview, then confirm.
 *
 * The write lands on a live agent that is answering real calls, so it deserves
 * a deliberate second action rather than a single click. The preview is also
 * the only accurate diff once another prompt change has already been applied —
 * the server rebases anchored edits onto the current prompt, so what is stored
 * on the recommendation is a diff against a prompt that has since moved.
 */
const pendingApply = ref<Recommendation | null>(null);
const applyPreview = ref<ApplyResult | null>(null);
const previewError = ref<string | null>(null);
const isPreviewing = ref(false);

/** The rebased diff when the preview resolved, the stored one until then. */
const previewChange = computed(
  () => applyPreview.value?.recommendation.change ?? pendingApply.value?.change ?? null,
);

const isPreviewTextChange = computed(() => {
  const change = previewChange.value;
  if (!change) return false;
  return (
    typeof change.before === 'string' && typeof change.after === 'string' && change.before.length > 200
  );
});

async function requestApply(recommendation: Recommendation): Promise<void> {
  pendingApply.value = recommendation;
  applyPreview.value = null;
  previewError.value = null;
  isPreviewing.value = true;

  const { result, error } = await optimizerStore.previewRecommendation(
    props.agentId,
    recommendation.id,
  );
  // A late response for a dialog the user already closed must not repopulate it.
  if (pendingApply.value?.id !== recommendation.id) return;

  applyPreview.value = result;
  previewError.value = error;
  isPreviewing.value = false;
}

function cancelApply(): void {
  pendingApply.value = null;
  applyPreview.value = null;
  previewError.value = null;
  isPreviewing.value = false;
}

async function confirmApply(): Promise<void> {
  const recommendation = pendingApply.value;
  if (!recommendation) return;

  const result = await optimizerStore.applyRecommendation(props.agentId, recommendation.id);
  cancelApply();
  if (!result) return;

  await Promise.all([
    agentsStore.loadAgents(),
    agentsStore.loadOverview(props.agentId),
    agentsStore.loadVersions(props.agentId),
  ]);

  notice.value = `Applied to HighLevel as version ${result.version}. It is live on this agent now — revert it from the History tab if that was not intended.`;
}

async function revertRecommendation(recommendation: Recommendation): Promise<void> {
  const result = await optimizerStore.revertRecommendation(props.agentId, recommendation.id);
  if (!result) return;

  await Promise.all([
    agentsStore.loadAgents(),
    agentsStore.loadOverview(props.agentId),
    agentsStore.loadVersions(props.agentId),
  ]);

  notice.value = `Reverted "${recommendation.title}", recorded as v${result.version}.${
    result.unrestoredFields.length
      ? ' Actions were not restored — they are created and deleted through separate endpoints.'
      : ''
  }`;
}

/**
 * Runs the suite.
 *
 * The first run is a **baseline**: there is nothing to compare it against, and
 * its job is to surface failures the transcripts could not — real calls only
 * show what callers happened to do, while the suite probes the scenarios they
 * have not tried yet. Those failures are then evidence the recommender reads.
 *
 * Every run after that is a **verification** pass pinned to the previous one,
 * so the results screen can show a per-case delta rather than two unrelated
 * scores. Labelling the first run "verification" would claim it verified
 * something when there was no prior state to verify against.
 */
async function runSuite(): Promise<void> {
  const previous = latestRun.value;

  await testRunJob.start(() =>
    api.startTestRun(props.agentId, {
      purpose: previous ? 'verification' : 'baseline',
      ...(previous ? { comparisonRunId: previous.id } : {}),
    }),
  );
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header ---------------------------------------------------------- -->
    <div class="space-y-3">
      <Button variant="ghost" size="sm" class="-ml-2" @click="router.push('/')">
        <ChevronLeft />
        All agents
      </Button>

      <div v-if="!agent && agentsStore.isLoadingAgents" class="space-y-2">
        <Skeleton class="h-6 w-64" />
        <Skeleton class="h-4 w-96" />
      </div>

      <div v-else-if="agent" class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-lg font-semibold tracking-tight">{{ agent.agentName }}</h1>
          <Badge variant="outline">v{{ agent.currentVersion }}</Badge>
          <Badge variant="outline">{{ pluralise(agent.actions.length, 'action') }}</Badge>
        </div>
        <p v-if="overview?.analysis?.goalStatement" class="max-w-3xl text-xs text-muted-foreground">
          <span class="font-medium text-foreground">Goal (inferred from its own prompt):</span>
          {{ overview.analysis.goalStatement }}
        </p>
      </div>
    </div>

    <Alert v-if="optimizerStore.error" variant="destructive">
      <div class="flex gap-2">
        <AlertCircle class="mt-0.5 size-4 shrink-0" />
        <p>{{ optimizerStore.error }}</p>
      </div>
    </Alert>

    <Alert v-if="notice" variant="muted">
      <div class="flex items-center gap-2">
        <Sparkles class="size-3.5 shrink-0" />
        <p class="flex-1">{{ notice }}</p>
        <Button variant="ghost" size="sm" @click="notice = null">Dismiss</Button>
      </div>
    </Alert>

    <!-- Overview -------------------------------------------------------- -->
    <Card v-if="overview">
      <CardContent class="pt-5">
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreStat
            label="Transcript score (real calls)"
            :value="overview.analysis?.score ?? null"
            tone
            :hint="
              overview.analysis
                ? `${pluralise(overview.calls.total, 'call')} analysed`
                : 'No analysis yet'
            "
          />
          <ScoreStat
            label="Open issues"
            :value="overview.issues.open"
            :hint="
              overview.issues.bySeverity.critical + overview.issues.bySeverity.high > 0
                ? `${overview.issues.bySeverity.critical} critical · ${overview.issues.bySeverity.high} high`
                : 'Nothing critical'
            "
          />
          <!--
            "Simulated" is in the label rather than the hint. This tile sits
            beside "Transcript score", which is measured on real calls, and at a
            glance the two read as the same kind of number. They are not.
          -->
          <ScoreStat
            label="Suite score (simulated)"
            :value="overview.testing.latestRun?.score ?? null"
            tone
            :delta="overview.testing.scoreDelta"
            :hint="
              overview.testing.latestRun
                ? `${overview.testing.latestRun.passed}/${overview.testing.activeCases} passing`
                : `${pluralise(overview.testing.activeCases, 'case')}, never run`
            "
          />
          <ScoreStat
            label="Recommendations"
            :value="overview.recommendations.proposed"
            :hint="`${overview.recommendations.applicable} one-click · ${overview.recommendations.advisory} manual`"
          />
        </div>

        <Separator class="my-5" />

        <!--
          The loop as four self-reporting steps. Exactly one is highlighted as
          the next action, and a result that has been superseded says so rather
          than looking identical to a fresh one.
        -->
        <LoopStepper :steps="loopSteps" :any-busy="anyJobRunning" @run="runStep" />

        <div class="mt-3 space-y-2">
          <JobProgress
            v-for="entry in jobRunners"
            :key="entry.key"
            :job="entry.runner.job.value"
            :is-running="entry.runner.isRunning.value"
            :label="entry.runner.progressLabel.value"
            :percent="entry.runner.progressPercent.value"
            :error="entry.runner.error.value"
          />
        </div>
      </CardContent>
    </Card>

    <Skeleton v-else class="h-52 w-full" />

    <!-- Tabs ------------------------------------------------------------ -->
    <Tabs v-model="activeTab">
      <TabsList>
        <TabsTrigger value="performance">
          <ClipboardList class="size-3.5" />
          Performance
          <Badge v-if="optimizerStore.openIssues.length" variant="secondary">
            {{ optimizerStore.openIssues.length }}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="tests">
          <ListChecks class="size-3.5" />
          Test cases
          <Badge v-if="optimizerStore.testCases.length" variant="secondary">
            {{ optimizerStore.testCases.length }}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="runs">
          <PlayCircle class="size-3.5" />
          Runs
          <Badge v-if="optimizerStore.testRuns.length" variant="secondary">
            {{ optimizerStore.testRuns.length }}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="recommendations">
          <Lightbulb class="size-3.5" />
          Recommendations
          <Badge v-if="pendingRecommendations.length" variant="secondary">
            {{ pendingRecommendations.length }}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="history">
          <History class="size-3.5" />
          History
        </TabsTrigger>
      </TabsList>

      <!-- Loop 1: performance -->
      <TabsContent value="performance" class="space-y-4">
        <Card v-if="overview?.analysis">
          <CardContent class="space-y-2 pt-5">
            <p class="text-xs font-medium">Summary</p>
            <p class="text-xs leading-relaxed text-muted-foreground">
              {{ overview.analysis.summary }}
            </p>
            <p class="text-[11px] text-muted-foreground">
              Analysed {{ formatRelative(overview.analysis.completedAt) }}
            </p>
          </CardContent>
        </Card>

        <!--
          Placed above the issue list because it answers the question the user
          arrives with on any run after the first: did last time's change work?
        -->
        <RegressionSummary
          v-if="optimizerStore.comparison"
          :comparison="optimizerStore.comparison"
        />

        <EmptyState
          v-if="!optimizerStore.openIssues.length && !hasAnalysis"
          :icon="ClipboardList"
          title="No analysis yet"
          description="Read the agent's real call transcripts to find recurring problems. This is the first loop and everything else builds on it."
        >
          <Button
            size="sm"
            :loading="analysisJob.isRunning.value"
            @click="analysisJob.start(() => api.startAnalysis(props.agentId))"
          >
            Analyse transcripts
          </Button>
        </EmptyState>

        <EmptyState
          v-else-if="!optimizerStore.issues.length"
          :icon="Sparkles"
          title="No issues found"
          description="The analysis completed without finding recurring problems in these transcripts."
        />

        <div v-else class="space-y-3">
          <IssueCard v-for="issue in optimizerStore.issues" :key="issue.id" :issue="issue" />
        </div>

        <!-- Source transcripts, so a finding can be checked against the call -->
        <CollapsibleSection
          v-if="optimizerStore.calls.length"
          title="Source transcripts"
          :count="optimizerStore.calls.length"
          :summary="callsSummary"
          :default-open="false"
          :padded="false"
        >
          <div class="divide-y">
            <button
              v-for="call in optimizerStore.calls"
              :key="call.id"
              type="button"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
              @click="openCall = call"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-medium">
                  {{ call.summary || 'No summary' }}
                </p>
                <p class="text-[11px] text-muted-foreground">
                  {{ formatRelative(call.startedAt) }} ·
                  {{ formatDuration(call.durationSeconds) }} ·
                  {{ call.stats.totalTurns }} turns · talk ratio {{ call.stats.talkRatio }}
                </p>
              </div>
              <Badge v-if="call.isSeeded" variant="medium">Seed data</Badge>
              <Badge v-else variant="pass">Real call</Badge>
              <Badge v-if="call.stats.interruptionCount" variant="outline">
                {{ pluralise(call.stats.interruptionCount, 'interruption') }}
              </Badge>
            </button>
          </div>
        </CollapsibleSection>
      </TabsContent>

      <!-- Loop 2a: test cases -->
      <TabsContent value="tests" class="space-y-3">
        <EmptyState
          v-if="!hasTestCases"
          :icon="FlaskConical"
          title="No test cases yet"
          description="Test cases are written from the agent's own prompt plus the issues found in real calls, so each edge case targets a problem that actually happened."
        >
          <Button
            size="sm"
            :disabled="!hasAnalysis"
            :loading="testGenJob.isRunning.value"
            @click="testGenJob.start(() => api.generateTestCases(props.agentId, { replaceExisting: true }))"
          >
            {{ hasAnalysis ? 'Generate test suite' : 'Run an analysis first' }}
          </Button>
        </EmptyState>

        <template v-else>
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-muted-foreground">
              {{ optimizerStore.testCases.filter((t) => t.type === 'happy_path').length }} happy path ·
              {{ optimizerStore.testCases.filter((t) => t.type === 'edge_case').length }} edge cases
            </p>
            <Button
              size="sm"
              variant="outline"
              :loading="testRunJob.isRunning.value"
              :disabled="anyJobRunning"
              @click="runSuite"
            >
              <PlayCircle v-if="!testRunJob.isRunning.value" />
              Run suite
            </Button>
          </div>

          <!-- Stated before the suite is run, not only on the results screen -->
          <SimulationNotice explain-delta />

          <TestCaseCard
            v-for="testCase in optimizerStore.testCases"
            :key="testCase.id"
            :test-case="testCase"
            :busy="optimizerStore.busy === testCase.id"
            @archive="optimizerStore.archiveTestCase(props.agentId, testCase.id)"
            @record-manual="
              (target, verdict, note) => optimizerStore.recordManualRun(target.id, verdict, note)
            "
            @clear-manual="(target) => optimizerStore.clearManualRun(target.id)"
          />
        </template>
      </TabsContent>

      <!-- Loop 2b: runs -->
      <TabsContent value="runs" class="space-y-2">
        <EmptyState
          v-if="!optimizerStore.testRuns.length"
          :icon="PlayCircle"
          title="No test runs yet"
          description="A run simulates every case against the agent's live configuration and scores each success criterion."
        />

        <div v-else class="divide-y overflow-hidden rounded-lg border">
          <RouterLink
            v-for="run in optimizerStore.testRuns"
            :key="run.id"
            :to="{ name: 'test-run', params: { agentId: props.agentId, testRunId: run.id } }"
            class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
          >
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex items-center gap-2">
                <Badge variant="outline">{{ runPurposeLabel(run.purpose) }}</Badge>
                <Badge variant="outline">Agent v{{ run.agentVersion }}</Badge>
                <Badge v-if="run.status !== 'completed'" variant="medium">
                  {{ titleCase(run.status) }}
                </Badge>
              </div>
              <p class="text-[11px] text-muted-foreground">
                {{ formatRelative(run.createdAt) }} ·
                {{ run.totals.passed }} passed, {{ run.totals.failed }} failed<template
                  v-if="run.totals.errored"
                  >, {{ run.totals.errored }} errored</template
                >
              </p>
            </div>
            <span class="text-lg font-semibold tabular-nums">{{ run.score }}</span>
          </RouterLink>
        </div>
      </TabsContent>

      <!-- Loop 3: recommendations -->
      <TabsContent value="recommendations" class="space-y-3">
        <EmptyState
          v-if="!optimizerStore.recommendations.length"
          :icon="Lightbulb"
          title="No recommendations yet"
          description="Recommendations are synthesised from transcript issues and failed test criteria. Every one traces back to specific evidence."
        >
          <Button
            size="sm"
            :disabled="!hasAnalysis && !latestRun"
            :loading="recommendJob.isRunning.value"
            @click="recommendJob.start(() => api.generateRecommendations(props.agentId))"
          >
            {{ hasAnalysis || latestRun ? 'Generate recommendations' : 'Analyse or run tests first' }}
          </Button>
        </EmptyState>

        <template v-else>
          <CollapsibleSection
            v-if="pendingRecommendations.length"
            title="Awaiting your decision"
            :count="pendingRecommendations.length"
            :summary="pendingSummary"
          >
            <RecommendationCard
              v-for="recommendation in pendingRecommendations"
              :key="recommendation.id"
              :recommendation="recommendation"
              :linked-issues="issuesFor(recommendation)"
              :busy="optimizerStore.busy === recommendation.id"
              @apply="requestApply"
              @dismiss="optimizerStore.rejectRecommendation(props.agentId, recommendation.id)"
            />
          </CollapsibleSection>

          <!--
            Decided proposals are history, not a to-do list: de-emphasised and
            folded away by default, with the outcome breakdown on the header so
            the collapsed state still says something useful.
          -->
          <CollapsibleSection
            v-if="settledRecommendations.length"
            title="Already decided"
            :count="settledRecommendations.length"
            :summary="settledSummary"
            tone="secondary"
            :default-open="false"
          >
            <RecommendationCard
              v-for="recommendation in settledRecommendations"
              :key="recommendation.id"
              :recommendation="recommendation"
              :linked-issues="issuesFor(recommendation)"
              :busy="optimizerStore.busy === recommendation.id"
              :current-version="agent?.currentVersion"
              @restore="optimizerStore.restoreRecommendation(props.agentId, recommendation.id)"
              @revert="revertRecommendation"
            />
          </CollapsibleSection>
        </template>
      </TabsContent>

      <!-- History -->
      <TabsContent value="history">
        <EmptyState
          v-if="!agentsStore.versions.length"
          :icon="History"
          title="No version history"
          description="A snapshot is recorded the first time an agent is seen, and on every change after that."
        />
        <VersionTimeline
          v-else
          :versions="agentsStore.versions"
          :current-version="agent?.currentVersion ?? 0"
          @rollback="
            async (version) => {
              const result = await agentsStore.rollback(props.agentId, version);
              if (result)
                notice = `Restored version ${version} as v${result.version}.${
                  result.unrestoredFields.length
                    ? ` Actions were not restored — they use separate endpoints.`
                    : ''
                }`;
              await optimizerStore.loadRecommendations(props.agentId);
            }
          "
        />
      </TabsContent>
    </Tabs>

    <!-- Real transcript viewer -->
    <Dialog
      v-if="openCall"
      :open="Boolean(openCall)"
      :title="openCall.isSeeded ? 'Seeded development call' : 'Real Voice AI call'"
      :description="`${formatDuration(openCall.durationSeconds)} · ${openCall.stats.totalTurns} turns · ${openCall.stats.interruptionCount} interruptions`"
      size="lg"
      @update:open="(value) => !value && (openCall = null)"
    >
      <div class="space-y-4">
        <Alert v-if="openCall.summary" variant="muted">
          <p class="text-xs">{{ openCall.summary }}</p>
        </Alert>
        <Alert v-if="capturedNothing" variant="advisory">
          <div class="flex gap-2">
            <Waves class="mt-0.5 size-3.5 shrink-0" />
            <p class="text-xs">
              No contact data was captured on this call, despite extraction actions being configured.
            </p>
          </div>
        </Alert>
        <TranscriptViewer :turns="openCall.turns" />
      </div>
    </Dialog>

    <!--
      Confirm before writing to a live agent.

      The diff shown here comes from the server's dry run, not from the stored
      recommendation, because prompt edits are rebased onto the current prompt
      at apply time. Approving the stored diff would mean approving text that is
      not what gets written.
    -->
    <Dialog
      v-if="pendingApply"
      :open="Boolean(pendingApply)"
      title="Apply this change to your live agent?"
      :description="pendingApply.title"
      size="xl"
      @update:open="(value) => !value && cancelApply()"
    >
      <div class="space-y-4">
        <Alert variant="advisory">
          <div class="flex gap-2">
            <AlertCircle class="mt-0.5 size-3.5 shrink-0" />
            <p class="text-xs">
              This writes to
              <span class="font-medium">{{ agent?.agentName }}</span>
              in HighLevel immediately. The agent answers real calls, so the change takes effect on
              the next one. A new version is recorded and can be reverted from the History tab.
            </p>
          </div>
        </Alert>

        <div v-if="isPreviewing" class="space-y-2">
          <Skeleton class="h-4 w-48" />
          <Skeleton class="h-32 w-full" />
        </div>

        <Alert v-else-if="previewError" variant="destructive">
          <p class="text-xs">{{ previewError }}</p>
        </Alert>

        <template v-else-if="previewChange">
          <p class="text-[11px] tracking-wide uppercase text-muted-foreground">
            Exactly what will be written
          </p>

          <PromptDiff
            v-if="isPreviewTextChange"
            :before="String(previewChange.before ?? '')"
            :after="String(previewChange.after ?? '')"
          />
          <div v-else class="rounded-md border border-pass/30 bg-pass/5 px-3 py-2">
            <pre class="font-mono-tight break-words whitespace-pre-wrap text-xs">{{
              typeof previewChange.after === 'string'
                ? previewChange.after
                : JSON.stringify(previewChange.after, null, 2)
            }}</pre>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" @click="cancelApply">Cancel</Button>
          <Button
            size="sm"
            :disabled="isPreviewing || Boolean(previewError)"
            :loading="optimizerStore.busy === pendingApply.id"
            @click="confirmApply"
          >
            Apply to HighLevel
          </Button>
        </div>
      </template>
    </Dialog>
  </div>
</template>
