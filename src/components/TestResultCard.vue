<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, MessageSquare, Phone, ThumbsDown, ThumbsUp, X } from 'lucide-vue-next';
import SimulationNotice from '@/components/SimulationNotice.vue';
import TranscriptViewer from '@/components/TranscriptViewer.vue';
import { Badge, Button, Card, CardContent, Dialog } from '@/components/ui';
import { formatRelative, scoreTone } from '@/lib/format';
import { resultStatusLabel, slugLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { TestCase, TestResult } from '@/types/api';

/**
 * The verdict for one test case, with the conversation that produced it.
 *
 * Every failing criterion carries the judge's reasoning inline. A score with no
 * readable justification is not something a customer will act on, and the
 * simulated transcript is one click away so the ruling can be checked rather
 * than taken on trust.
 */
const props = defineProps<{
  result: TestResult;
  /** Score for the same case in the comparison run, when there is one. */
  previousScore?: number | null;
  /** Full case details, used as the script for a real-agent check. */
  testCase?: TestCase | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  'record-manual': [testCaseId: string, verdict: 'passed' | 'failed', note: string];
  'clear-manual': [testCaseId: string];
}>();

const showTranscript = ref(false);
const highlightTurn = ref<number | null>(null);
const note = ref('');

const toneClass = computed(
  () =>
    ({ pass: 'text-pass', warn: 'text-severity-medium', fail: 'text-fail' })[
      scoreTone(props.result.score)
    ],
);

const statusVariant = computed(() => {
  if (props.result.status === 'passed') return 'pass' as const;
  if (props.result.status === 'errored') return 'errored' as const;
  return 'fail' as const;
});

const delta = computed(() => {
  if (props.previousScore === null || props.previousScore === undefined) return null;
  return props.result.score - props.previousScore;
});

function openTranscript(turnIndex?: number): void {
  highlightTurn.value = turnIndex ?? null;
  showTranscript.value = true;
}

function record(verdict: 'passed' | 'failed'): void {
  emit('record-manual', props.result.testCaseId, verdict, note.value.trim());
  note.value = '';
}
</script>

<template>
  <Card>
    <CardContent class="space-y-3 pt-5">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="statusVariant">{{ resultStatusLabel(props.result.status) }}</Badge>
            <Badge
              v-for="mode in props.result.failureModes"
              :key="mode"
              variant="outline"
            >
              {{ slugLabel(mode) }}
            </Badge>
          </div>
          <p class="text-sm font-medium">{{ props.result.testCaseTitle }}</p>
        </div>

        <div class="shrink-0 text-right">
          <p :class="cn('text-xl font-semibold tabular-nums', toneClass)">
            {{ props.result.score }}
          </p>
          <p
            v-if="delta !== null"
            :class="
              cn(
                'text-[11px] font-medium tabular-nums',
                delta > 0 ? 'text-pass' : delta < 0 ? 'text-fail' : 'text-muted-foreground',
              )
            "
          >
            {{ delta > 0 ? '+' : '' }}{{ delta }} vs before
          </p>
        </div>
      </div>

      <p v-if="props.result.error" class="text-xs text-fail">{{ props.result.error }}</p>

      <p v-if="props.result.judgeSummary" class="text-xs leading-relaxed text-muted-foreground">
        {{ props.result.judgeSummary }}
      </p>

      <ul v-if="props.result.criterionResults.length" class="divide-y rounded-md border">
        <li
          v-for="criterion in props.result.criterionResults"
          :key="criterion.key"
          class="flex items-start gap-2.5 px-3 py-2"
        >
          <component
            :is="criterion.passed ? Check : X"
            :class="cn('mt-0.5 size-3.5 shrink-0', criterion.passed ? 'text-pass' : 'text-fail')"
          />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium">
              {{ criterion.label }}
              <span class="text-muted-foreground">· w{{ criterion.weight }}</span>
              <Badge v-if="criterion.mustPass" variant="critical" class="ml-1">Must pass</Badge>
            </p>
            <p v-if="!criterion.passed" class="mt-0.5 text-xs text-muted-foreground">
              {{ criterion.reasoning }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <!-- Low confidence is surfaced rather than hidden behind a binary verdict. -->
            <span
              v-if="criterion.confidence < 0.7"
              class="text-[11px] tabular-nums text-severity-medium"
              title="The judge was uncertain about this ruling"
            >
              {{ Math.round(criterion.confidence * 100) }}%
            </span>
            <button
              v-if="criterion.evidenceTurnIndex !== undefined"
              type="button"
              class="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              @click="openTranscript(criterion.evidenceTurnIndex)"
            >
              turn {{ criterion.evidenceTurnIndex }}
            </button>
          </div>
        </li>
      </ul>

      <Button
        v-if="props.result.simulatedTurns.length"
        variant="outline"
        size="sm"
        @click="openTranscript()"
      >
        <MessageSquare />
        View simulated call ({{ props.result.simulatedTurns.length }} turns)
      </Button>

      <!--
        Run it for real.

        This sits beside the simulated verdict because that is when a reviewer
        can decide whether the failure matters enough to test on HighLevel's
        real runtime.
      -->
      <div v-if="props.testCase" class="rounded-md border border-dashed px-3 py-2.5">
        <div class="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-muted-foreground">
          <Phone class="size-3" />
          Try it on the real agent
        </div>

        <template v-if="props.testCase.manualRun">
          <p class="text-xs">
            <span
              class="font-medium"
              :class="props.testCase.manualRun.verdict === 'passed' ? 'text-pass' : 'text-fail'"
            >
              {{ props.testCase.manualRun.verdict === 'passed' ? 'Passed' : 'Failed' }}
            </span>
            <span class="text-muted-foreground">
              on a real call, {{ formatRelative(props.testCase.manualRun.recordedAt) }}
            </span>
          </p>
          <p v-if="props.testCase.manualRun.note" class="mt-1 text-xs text-muted-foreground">
            “{{ props.testCase.manualRun.note }}”
          </p>
          <Button
            variant="ghost"
            size="sm"
            class="mt-1.5 -ml-2"
            :disabled="props.busy"
            @click="emit('clear-manual', props.result.testCaseId)"
          >
            <X />
            Clear
          </Button>
        </template>

        <template v-else>
          <p class="text-xs text-muted-foreground">
            Phone the agent and run this scenario. Record what happened — this verdict comes from
            the live platform, not the simulation.
          </p>
          <input
            v-model="note"
            type="text"
            placeholder="What happened? (optional)"
            class="mt-2 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keyup.enter="record('passed')"
          />
          <div class="mt-2 flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="props.busy" @click="record('passed')">
              <ThumbsUp />
              It passed
            </Button>
            <Button variant="outline" size="sm" :disabled="props.busy" @click="record('failed')">
              <ThumbsDown />
              It failed
            </Button>
          </div>
        </template>
      </div>
    </CardContent>
  </Card>

  <Dialog
    v-model:open="showTranscript"
    :title="props.result.testCaseTitle"
    description="Simulated conversation against the agent's live prompt"
    size="lg"
  >
    <div class="space-y-3">
      <!--
        Right above the transcript, because this is the screen where a reader is
        most likely to mistake a simulation for a recording of a real call.
      -->
      <SimulationNotice variant="inline" />
      <TranscriptViewer :turns="props.result.simulatedTurns" :highlight-index="highlightTurn" />
    </div>
  </Dialog>
</template>
