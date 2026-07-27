<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    value: number;
    max?: number;
    /** Tailwind colour class for the filled portion, e.g. `bg-pass`. */
    barClass?: string;
    class?: string;
    /** Renders as an indeterminate shimmer when the total is unknown. */
    indeterminate?: boolean;
  }>(),
  { max: 100, indeterminate: false },
);

const percent = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min(100, Math.max(0, (props.value / props.max) * 100));
});
</script>

<template>
  <div
    :class="cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', props.class)"
    role="progressbar"
    :aria-valuenow="props.indeterminate ? undefined : props.value"
    :aria-valuemax="props.max"
  >
    <div
      v-if="props.indeterminate"
      class="h-full w-1/3 animate-pulse rounded-full bg-primary/60"
    />
    <div
      v-else
      :class="cn('h-full rounded-full transition-[width] duration-500', props.barClass ?? 'bg-primary')"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
