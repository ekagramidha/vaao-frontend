<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, GitCompare } from 'lucide-vue-next';
import ScoreStat from '@/components/ScoreStat.vue';
import SimulationNotice from '@/components/SimulationNotice.vue';
import TestResultCard from '@/components/TestResultCard.vue';
import { Alert, Badge, Button, Card, CardContent, Separator, Skeleton } from '@/components/ui';
import { formatRelative, pluralise } from '@/lib/format';
import { runPurposeLabel } from '@/lib/labels';
import { useOptimizerStore } from '@/stores/optimizer';

/**
 * One test run in detail — the before/after screen.
 *
 * When the run was created as a verification pass it carries a
 * `comparisonRunId`, and every case shows its score against the same case in
 * that earlier run. That per-case delta is the evidence that an applied change
 * actually helped, rather than just moving an aggregate number.
 */
const props = defineProps<{ agentId: string; testRunId: string }>();

const optimizerStore = useOptimizerStore();
const router = useRouter();

const run = computed(() => optimizerStore.selectedRun);
const results = computed(() => optimizerStore.selectedRunResults);
const comparison = computed(() => optimizerStore.comparisonRun);
const testCasesById = computed(
  () => new Map(optimizerStore.testCases.map((testCase) => [testCase.id, testCase])),
);

const scoreDelta = computed(() => {
  if (!run.value || !comparison.value) return null;
  return run.value.score - comparison.value.score;
});

/** Cases that changed verdict, which is what a reviewer looks for first. */
const changed = computed(() =>
  results.value.filter((result) => {
    const previous = optimizerStore.comparisonScores.get(result.testCaseId);
    return previous !== undefined && previous !== result.score;
  }),
);

async function load(): Promise<void> {
  await Promise.all([
    optimizerStore.loadRun(props.testRunId),
    optimizerStore.loadTestCases(props.agentId),
  ]);
}

onMounted(load);

watch(
  () => [props.agentId, props.testRunId],
  load,
);
</script>

<template>
  <div class="space-y-5">
    <Button
      variant="ghost"
      size="sm"
      class="-ml-2"
      @click="router.push({ name: 'agent', params: { agentId: props.agentId } })"
    >
      <ChevronLeft />
      Back to agent
    </Button>

    <Skeleton v-if="!run" class="h-40 w-full" />

    <template v-else>
      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-lg font-semibold tracking-tight">Test run</h1>
          <Badge variant="outline">{{ runPurposeLabel(run.purpose) }}</Badge>
          <Badge variant="outline">Agent v{{ run.agentVersion }}</Badge>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ formatRelative(run.createdAt) }} ·
          {{ pluralise(run.totals.total, 'case') }}
        </p>
      </div>

      <Alert v-if="run.error" variant="destructive">{{ run.error }}</Alert>

      <!-- Above the numbers, so the caveat is read before the score is believed -->
      <SimulationNotice explain-delta />

      <Card>
        <CardContent class="pt-5">
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreStat label="Suite score" :value="run.score" tone :delta="scoreDelta" />
            <ScoreStat label="Passed" :value="run.totals.passed" />
            <ScoreStat label="Failed" :value="run.totals.failed" />
            <ScoreStat
              label="Errored"
              :value="run.totals.errored"
              hint="Excluded from the score"
            />
          </div>

          <!--
            The comparison banner only appears when there is genuinely something
            to compare, rather than showing an empty delta by default.
          -->
          <template v-if="comparison">
            <Separator class="my-5" />
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <GitCompare class="size-3.5 text-muted-foreground" />
              <span class="font-medium">Compared against</span>
              <RouterLink
                :to="{ name: 'test-run', params: { agentId: props.agentId, testRunId: comparison.id } }"
                class="underline-offset-2 hover:underline"
              >
                the run from {{ formatRelative(comparison.createdAt) }}
              </RouterLink>
              <span class="text-muted-foreground">
                (agent v{{ comparison.agentVersion }}, scored {{ comparison.score }})
              </span>
              <Badge v-if="changed.length" variant="outline" class="ml-auto">
                {{ pluralise(changed.length, 'case') }} changed
              </Badge>
            </div>
          </template>
        </CardContent>
      </Card>

      <div class="space-y-3">
        <TestResultCard
          v-for="result in results"
          :key="result.id"
          :result="result"
          :previous-score="optimizerStore.comparisonScores.get(result.testCaseId) ?? null"
          :test-case="testCasesById.get(result.testCaseId) ?? null"
          :busy="optimizerStore.busy === result.testCaseId"
          @record-manual="
            (testCaseId, verdict, note) => optimizerStore.recordManualRun(testCaseId, verdict, note)
          "
          @clear-manual="(testCaseId) => optimizerStore.clearManualRun(testCaseId)"
        />
      </div>
    </template>
  </div>
</template>
