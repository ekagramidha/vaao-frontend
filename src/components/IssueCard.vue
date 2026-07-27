<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, Quote } from 'lucide-vue-next';
import { Badge, Card, CardContent, Progress } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { issueCategoryLabel, severityLabel } from '@/lib/labels';
import { SEVERITY_BAR, SEVERITY_BORDER } from '@/lib/severity';
import { cn } from '@/lib/utils';
import type { Issue } from '@/types/api';

/**
 * One recurring issue, with the evidence that proves it.
 *
 * Frequency is given the most visual weight after severity. "5 of 8 calls" is
 * what turns an observation into something a business will act on, and it is
 * the number that distinguishes this from a generic prompt-review checklist.
 */
const props = defineProps<{ issue: Issue }>();

const expanded = ref(false);

const severityVariant = computed(
  () => props.issue.severity as 'critical' | 'high' | 'medium' | 'low',
);

// Selected from a static map, never built as a template literal — Tailwind
// only generates classes it can see as literal text in the source.
const barClass = computed(() => SEVERITY_BAR[props.issue.severity]);
const evidenceBorderClass = computed(() => SEVERITY_BORDER[props.issue.severity]);
</script>

<template>
  <Card>
    <CardContent class="space-y-3 pt-5">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="severityVariant">{{ severityLabel(props.issue.severity) }}</Badge>
            <Badge variant="outline">{{ issueCategoryLabel(props.issue.category) }}</Badge>
            <Badge v-if="props.issue.status === 'addressed'" variant="pass">Addressed</Badge>
          </div>
          <p class="text-sm font-medium">{{ props.issue.title }}</p>
        </div>

        <div class="w-28 shrink-0 space-y-1 text-right">
          <p class="text-sm font-semibold tabular-nums">
            {{ props.issue.frequency.affectedCalls }}/{{ props.issue.frequency.totalCalls }}
          </p>
          <p class="text-[11px] text-muted-foreground">
            {{ formatPercent(props.issue.frequency.rate) }} of calls
          </p>
          <Progress :value="props.issue.frequency.rate * 100" :bar-class="barClass" />
        </div>
      </div>

      <p class="text-xs leading-relaxed text-muted-foreground">{{ props.issue.description }}</p>

      <div class="rounded-md bg-muted/50 px-3 py-2">
        <p class="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
          Suggested direction
        </p>
        <p class="mt-0.5 text-xs">{{ props.issue.suggestedDirection }}</p>
      </div>

      <div v-if="props.issue.evidence.length" class="space-y-2">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          @click="expanded = !expanded"
        >
          <ChevronRight :class="cn('size-3.5 transition-transform', expanded && 'rotate-90')" />
          {{ props.issue.evidence.length }} quote{{ props.issue.evidence.length === 1 ? '' : 's' }}
          from real calls
        </button>

        <ul v-if="expanded" class="space-y-2">
          <li
            v-for="(item, index) in props.issue.evidence"
            :key="`${item.callId}-${item.turnIndex}-${index}`"
            class="rounded-md border-l-2 bg-muted/30 py-2 pr-3 pl-3"
            :class="evidenceBorderClass"
          >
            <div class="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Quote class="size-3" />
              <span class="font-mono-tight">{{ item.callId }}</span>
              <span>· turn {{ item.turnIndex }}</span>
            </div>
            <p class="font-mono-tight">{{ item.quote }}</p>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
</template>
