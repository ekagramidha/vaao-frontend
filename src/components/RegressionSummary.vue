<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, Minus } from 'lucide-vue-next';
import { Alert, Badge, Card, CardContent } from '@/components/ui';
import { formatPercent, formatRelative } from '@/lib/format';
import { issueCategoryLabel } from '@/lib/labels';
import { SEVERITY_DOT } from '@/lib/severity';
import type { AnalysisComparison, IssueDelta } from '@/types/api';

/**
 * What changed on real calls between this analysis and the last one.
 *
 * This is the only before/after in the product measured on the actual
 * HighLevel agent rather than in simulation, so it is stated plainly and
 * without a score. Issues are matched across runs by fingerprint, and compared
 * as rates because two analyses rarely read the same number of calls.
 */
const props = defineProps<{ comparison: AnalysisComparison }>();

const hasAnyMovement = computed(
  () =>
    props.comparison.resolved.length > 0 ||
    props.comparison.persisting.length > 0 ||
    props.comparison.introduced.length > 0,
);

/** Rate change in points, positive meaning the problem got worse. */
function rateDelta(delta: IssueDelta): number | null {
  if (delta.previousRate === null || delta.currentRate === null) return null;
  return Math.round((delta.currentRate - delta.previousRate) * 100);
}
</script>

<template>
  <Card>
    <CardContent class="space-y-4 pt-5">
      <div class="flex flex-wrap items-baseline gap-2">
        <p class="text-sm font-semibold">Since the previous analysis</p>
        <span class="text-xs text-muted-foreground">
          {{ formatRelative(props.comparison.previousCompletedAt) }} ·
          {{ props.comparison.previousCallCount }} calls then,
          {{ props.comparison.currentCallCount }} now
        </span>
      </div>

      <!--
        The single most important caveat in this view. Re-analysing the same
        transcripts reproduces the same issues by construction — those calls
        happened before the change did — so a "still present" reading would be
        meaningless. Said before the numbers, not after them.
      -->
      <Alert v-if="props.comparison.readsOnlyOldCalls" variant="advisory">
        <div class="flex gap-2">
          <AlertTriangle class="mt-0.5 size-3.5 shrink-0" />
          <p class="text-xs">
            This analysis read no calls the previous one had not already seen, so nothing below
            measures whether a change worked. An issue still appearing here only means the same old
            transcript still contains it. Wait for new calls, then analyse again.
          </p>
        </div>
      </Alert>

      <Alert v-else-if="!props.comparison.changesBetween.length" variant="muted">
        <div class="flex gap-2">
          <Info class="mt-0.5 size-3.5 shrink-0" />
          <p class="text-xs">
            {{ props.comparison.freshCallCount }} new call{{
              props.comparison.freshCallCount === 1 ? '' : 's'
            }}
            since the last analysis, but no optimizer changes were applied in between. Movement here
            reflects call-to-call variation, not a fix.
          </p>
        </div>
      </Alert>

      <p v-else class="text-xs text-muted-foreground">
        {{ props.comparison.freshCallCount }} new call{{
          props.comparison.freshCallCount === 1 ? '' : 's'
        }}
        since the last analysis, with
        {{ props.comparison.changesBetween.length }} change{{
          props.comparison.changesBetween.length === 1 ? '' : 's'
        }}
        applied in between ({{
          props.comparison.changesBetween.map((change) => `v${change.version}`).join(', ')
        }}).
      </p>

      <p v-if="!hasAnyMovement" class="text-xs text-muted-foreground">
        No recurring issues in either analysis.
      </p>

      <div v-else class="space-y-3">
        <!-- Gone -->
        <div v-if="props.comparison.resolved.length" class="space-y-1.5">
          <p class="flex items-center gap-1.5 text-xs font-medium">
            <CheckCircle2 class="size-3.5 text-pass" />
            No longer appearing
            <Badge variant="pass">{{ props.comparison.resolved.length }}</Badge>
          </p>
          <div
            v-for="delta in props.comparison.resolved"
            :key="delta.fingerprint"
            class="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2"
          >
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full" :class="SEVERITY_DOT[delta.severity]" />
            <p class="min-w-0 flex-1 text-xs">
              {{ delta.title }}
              <span class="text-muted-foreground">
                — {{ issueCategoryLabel(delta.category) }}, was in
                {{ formatPercent(delta.previousRate ?? 0) }} of calls
              </span>
            </p>
          </div>
        </div>

        <!-- Still there -->
        <div v-if="props.comparison.persisting.length" class="space-y-1.5">
          <p class="flex items-center gap-1.5 text-xs font-medium">
            <Minus class="size-3.5 text-muted-foreground" />
            Still present
            <Badge variant="secondary">{{ props.comparison.persisting.length }}</Badge>
          </p>
          <div
            v-for="delta in props.comparison.persisting"
            :key="delta.fingerprint"
            class="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2"
          >
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full" :class="SEVERITY_DOT[delta.severity]" />
            <p class="min-w-0 flex-1 text-xs">
              {{ delta.title }}
              <span class="text-muted-foreground">
                — {{ formatPercent(delta.previousRate ?? 0) }} →
                {{ formatPercent(delta.currentRate ?? 0) }} of calls
              </span>
            </p>
            <span
              v-if="rateDelta(delta) !== null && rateDelta(delta) !== 0"
              class="flex shrink-0 items-center gap-0.5 text-xs tabular-nums"
              :class="(rateDelta(delta) ?? 0) < 0 ? 'text-pass' : 'text-fail'"
            >
              <component :is="(rateDelta(delta) ?? 0) < 0 ? ArrowDownRight : ArrowUpRight" class="size-3" />
              {{ Math.abs(rateDelta(delta) ?? 0) }} pts
            </span>
          </div>
        </div>

        <!-- New -->
        <div v-if="props.comparison.introduced.length" class="space-y-1.5">
          <p class="flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle class="size-3.5 text-fail" />
            New since last time
            <Badge variant="fail">{{ props.comparison.introduced.length }}</Badge>
          </p>
          <div
            v-for="delta in props.comparison.introduced"
            :key="delta.fingerprint"
            class="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2"
          >
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full" :class="SEVERITY_DOT[delta.severity]" />
            <p class="min-w-0 flex-1 text-xs">
              {{ delta.title }}
              <span class="text-muted-foreground">
                — {{ issueCategoryLabel(delta.category) }}, in
                {{ formatPercent(delta.currentRate ?? 0) }} of calls
              </span>
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
