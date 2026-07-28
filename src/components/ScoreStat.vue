<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-vue-next';
import { scoreTone } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';

/**
 * A headline number with an optional change indicator.
 *
 * The delta is the point of the before/after story, so it is rendered as a
 * first-class part of the stat rather than as a footnote underneath it.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    value: number | string | null;
    suffix?: string;
    /** Change against the previous comparable measurement. */
    delta?: number | null;
    /** Colours the value by score band. Only meaningful for 0-100 scores. */
    tone?: boolean;
    hint?: string;
    tooltip?: string;
  }>(),
  { tone: false, delta: null },
);

const toneClass = computed(() => {
  if (!props.tone || typeof props.value !== 'number') return '';
  return {
    pass: 'text-pass',
    warn: 'text-severity-medium',
    fail: 'text-fail',
  }[scoreTone(props.value)];
});

const deltaIcon = computed(() => {
  if (props.delta === null || props.delta === undefined || props.delta === 0) return ArrowRight;
  return props.delta > 0 ? ArrowUpRight : ArrowDownRight;
});

const deltaClass = computed(() => {
  if (props.delta === null || props.delta === undefined || props.delta === 0) {
    return 'text-muted-foreground';
  }
  return props.delta > 0 ? 'text-pass' : 'text-fail';
});
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-1.5">
      <p class="text-xs text-muted-foreground">{{ props.label }}</p>
      <TooltipProvider v-if="props.tooltip">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="`${props.label}: ${props.tooltip}`"
            >
              <Info class="size-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent class="text-[12px]">
            {{ props.tooltip }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div class="flex items-baseline gap-2">
      <span :class="cn('text-2xl font-semibold tabular-nums tracking-tight', toneClass)">
        {{ props.value ?? '—' }}<span v-if="props.suffix" class="text-base">{{ props.suffix }}</span>
      </span>
      <span
        v-if="props.delta !== null && props.delta !== undefined"
        :class="cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', deltaClass)"
      >
        <component :is="deltaIcon" class="size-3" />
        {{ props.delta > 0 ? '+' : '' }}{{ props.delta }}
      </span>
    </div>
    <p v-if="props.hint" class="text-xs text-muted-foreground">{{ props.hint }}</p>
  </div>
</template>
