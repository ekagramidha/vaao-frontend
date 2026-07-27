<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowRight, Check, Info, Link2, Lock, RotateCcw, Undo2, X } from 'lucide-vue-next';
import PromptDiff from '@/components/PromptDiff.vue';
import { Alert, Badge, Button, Card, CardContent, Separator } from '@/components/ui';
import {
  fieldLabel,
  recommendationStatusLabel,
  recommendationTypeLabel,
  severityLabel,
  slugLabel,
} from '@/lib/labels';
import { SEVERITY_DOT } from '@/lib/severity';
import type { Issue, Recommendation } from '@/types/api';

/**
 * A single optimization proposal, with its evidence and its before/after.
 *
 * The design puts the reasoning above the diff on purpose. The brief asks for
 * "clear before vs after reasoning for why each recommendation improves the
 * agent", and a reviewer needs to know *why* before they are shown *what* —
 * otherwise they evaluate the text of a prompt edit rather than the argument
 * for making it.
 */
const props = defineProps<{
  recommendation: Recommendation;
  /** Resolved issues this proposal cites, for the evidence line. */
  linkedIssues: Issue[];
  busy: boolean;
  /**
   * The agent's current version. An applied change can only be undone on its
   * own while it is still the latest one, because restoring the snapshot
   * beneath an earlier change would discard everything stacked above it.
   */
  currentVersion?: number;
}>();

const emit = defineEmits<{
  apply: [recommendation: Recommendation];
  dismiss: [recommendation: Recommendation];
  restore: [recommendation: Recommendation];
  revert: [recommendation: Recommendation];
}>();

const showEvidence = ref(false);

const isApplicable = computed(() => props.recommendation.applicability === 'applicable');
const isPending = computed(() => props.recommendation.status === 'proposed');

const isRevertable = computed(
  () =>
    props.recommendation.status === 'applied' &&
    props.recommendation.appliedVersion !== undefined &&
    props.recommendation.appliedVersion === props.currentVersion &&
    props.recommendation.appliedVersion > 1,
);

/** Applied, but no longer the latest change — undo is a version rollback now. */
const isSupersededByLaterChange = computed(
  () =>
    props.recommendation.status === 'applied' &&
    props.recommendation.appliedVersion !== undefined &&
    props.currentVersion !== undefined &&
    props.recommendation.appliedVersion < props.currentVersion,
);

/** Long text gets a line diff; anything else is a simple before → after. */
const isTextChange = computed(() => {
  const { before, after } = props.recommendation.change;
  return typeof before === 'string' && typeof after === 'string' && before.length > 200;
});

function render(value: unknown): string {
  if (value === null || value === undefined) return 'not set';
  if (typeof value === 'string') return value || '(empty)';
  return JSON.stringify(value, null, 2);
}

const statusVariant = computed(() => {
  switch (props.recommendation.status) {
    case 'applied':
      return 'pass' as const;
    case 'rejected':
      return 'outline' as const;
    case 'rolled_back':
      return 'fail' as const;
    default:
      return 'secondary' as const;
  }
});
</script>

<template>
  <Card>
    <CardContent class="space-y-4 pt-5">
      <!-- Header: what kind of change, how urgent, and whether we can write it -->
      <div class="flex flex-wrap items-center gap-2">
        <Badge :variant="props.recommendation.priority">
          {{ severityLabel(props.recommendation.priority) }}
        </Badge>
        <Badge variant="outline">{{ recommendationTypeLabel(props.recommendation.type) }}</Badge>

        <Badge v-if="isApplicable" variant="pass" class="gap-1">
          <Check class="size-3" />
          One-click
        </Badge>
        <Badge v-else variant="advisory" class="gap-1">
          <Lock class="size-3" />
          Manual change
        </Badge>

        <Badge v-if="props.recommendation.status !== 'proposed'" :variant="statusVariant">
          {{ recommendationStatusLabel(props.recommendation.status) }}
          <template v-if="props.recommendation.appliedVersion">
            · v{{ props.recommendation.appliedVersion }}
          </template>
        </Badge>

        <span class="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {{ Math.round(props.recommendation.confidence * 100) }}% confidence
        </span>
      </div>

      <p class="text-sm font-semibold">{{ props.recommendation.title }}</p>

      <!-- Reasoning first, diff second. -->
      <div class="space-y-2.5 text-xs leading-relaxed">
        <div>
          <p class="font-medium">Why</p>
          <p class="text-muted-foreground">{{ props.recommendation.rationale }}</p>
        </div>
        <div v-if="props.recommendation.expectedImpact">
          <p class="font-medium">Expected effect</p>
          <p class="text-muted-foreground">{{ props.recommendation.expectedImpact }}</p>
        </div>
      </div>

      <!--
        Advisory reason sits above the diff so nobody hunts for an Apply button
        that is not there.
      -->
      <Alert v-if="!isApplicable && props.recommendation.advisoryReason" variant="advisory">
        <div class="flex gap-2">
          <Info class="mt-0.5 size-3.5 shrink-0" />
          <p class="text-xs">{{ props.recommendation.advisoryReason }}</p>
        </div>
      </Alert>

      <!-- Evidence trail: this is what makes the loop provably closed -->
      <div
        v-if="props.linkedIssues.length || props.recommendation.linkedCriterionKeys.length"
        class="space-y-2"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          @click="showEvidence = !showEvidence"
        >
          <Link2 class="size-3.5" />
          Traced to
          <template v-if="props.linkedIssues.length">
            {{ props.linkedIssues.length }} transcript issue{{
              props.linkedIssues.length === 1 ? '' : 's'
            }}
          </template>
          <template v-if="props.linkedIssues.length && props.recommendation.linkedCriterionKeys.length">
            and
          </template>
          <template v-if="props.recommendation.linkedCriterionKeys.length">
            {{ props.recommendation.linkedCriterionKeys.length }} failed criteri{{
              props.recommendation.linkedCriterionKeys.length === 1 ? 'on' : 'a'
            }}
          </template>
        </button>

        <div v-if="showEvidence" class="space-y-1.5 rounded-md bg-muted/40 px-3 py-2.5">
          <div v-for="issue in props.linkedIssues" :key="issue.id" class="flex items-start gap-2">
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full" :class="SEVERITY_DOT[issue.severity]" />
            <p class="text-xs">
              {{ issue.title }}
              <span class="text-muted-foreground">
                — {{ issue.frequency.affectedCalls }}/{{ issue.frequency.totalCalls }} calls
              </span>
            </p>
          </div>
          <div
            v-if="props.recommendation.linkedCriterionKeys.length"
            class="flex flex-wrap gap-1 pt-1"
          >
            <Badge
              v-for="key in props.recommendation.linkedCriterionKeys"
              :key="key"
              variant="fail"
            >
              {{ slugLabel(key) }}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      <!-- Before vs after -->
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-[11px] tracking-wide uppercase text-muted-foreground">
          <span>Before vs after</span>
          <span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium normal-case">
            {{ fieldLabel(props.recommendation.change.field) }}
          </span>
        </div>

        <ul
          v-if="props.recommendation.change.changeSummary.length"
          class="space-y-1 text-xs text-muted-foreground"
        >
          <li
            v-for="(item, index) in props.recommendation.change.changeSummary"
            :key="index"
            class="flex gap-2"
          >
            <span class="text-foreground">·</span>{{ item }}
          </li>
        </ul>

        <PromptDiff
          v-if="isTextChange"
          :before="String(props.recommendation.change.before ?? '')"
          :after="String(props.recommendation.change.after ?? '')"
        />

        <div v-else class="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div class="rounded-md border bg-muted/30 px-3 py-2">
            <p class="mb-1 text-[11px] text-muted-foreground">Current</p>
            <pre class="font-mono-tight break-words whitespace-pre-wrap">{{
              render(props.recommendation.change.before)
            }}</pre>
          </div>
          <ArrowRight class="mx-auto hidden size-4 text-muted-foreground sm:block" />
          <div class="rounded-md border border-pass/30 bg-pass/5 px-3 py-2">
            <p class="mb-1 text-[11px] text-muted-foreground">Proposed</p>
            <pre class="font-mono-tight break-words whitespace-pre-wrap">{{
              render(props.recommendation.change.after)
            }}</pre>
          </div>
        </div>
      </div>

      <div v-if="isPending" class="flex items-center gap-2 pt-1">
        <Button
          v-if="isApplicable"
          size="sm"
          :loading="props.busy"
          @click="emit('apply', props.recommendation)"
        >
          <Check v-if="!props.busy" />
          Apply to HighLevel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="props.busy"
          @click="emit('dismiss', props.recommendation)"
        >
          <X />
          Dismiss
        </Button>
      </div>

      <!--
        Undo for a dismissal. Without it the only way back is regenerating,
        which supersedes every other proposal still awaiting a decision.
      -->
      <div v-else-if="props.recommendation.status === 'rejected'" class="pt-1">
        <Button
          variant="outline"
          size="sm"
          :loading="props.busy"
          @click="emit('restore', props.recommendation)"
        >
          <RotateCcw v-if="!props.busy" />
          Restore to pending
        </Button>
      </div>

      <!-- Undo for an applied change, offered only while it is still the top of the history -->
      <div v-else-if="isRevertable" class="pt-1">
        <Button
          variant="outline"
          size="sm"
          :loading="props.busy"
          @click="emit('revert', props.recommendation)"
        >
          <Undo2 v-if="!props.busy" />
          Revert this change
        </Button>
      </div>

      <!--
        Deliberately not a disabled Revert button. "Undo this change" and "roll
        back to a version" are different operations, and offering the first one
        greyed out invites the user to expect it to do the second.
      -->
      <p v-else-if="isSupersededByLaterChange" class="pt-1 text-xs text-muted-foreground">
        Later changes have been applied since this one. Undoing it means rolling back to
        v{{ (props.recommendation.appliedVersion ?? 1) - 1 }} from the History tab, which also
        discards those.
      </p>
    </CardContent>
  </Card>
</template>
