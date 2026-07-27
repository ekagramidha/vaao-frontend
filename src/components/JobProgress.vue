<script setup lang="ts">
import { Alert, Progress } from '@/components/ui';
import type { Job } from '@/types/api';

/**
 * Live progress for a running job.
 *
 * The message comes straight from the backend worker, which writes it for a
 * customer rather than for a log — "Ran 'Upset overcharge caller wants manager'"
 * tells the user what is happening in a way a percentage cannot.
 */
const props = defineProps<{
  job: Job | null;
  isRunning: boolean;
  label: string;
  percent: number | null;
  error: string | null;
}>();
</script>

<template>
  <div v-if="props.isRunning || props.error" class="space-y-2">
    <template v-if="props.isRunning">
      <div class="flex items-baseline justify-between gap-3">
        <p class="truncate text-xs text-muted-foreground">{{ props.label || 'Working' }}</p>
        <span v-if="props.percent !== null" class="text-xs tabular-nums text-muted-foreground">
          {{ props.percent }}%
        </span>
      </div>
      <!-- Indeterminate until the worker reports a total, rather than showing a fake 0%. -->
      <Progress
        :value="props.percent ?? 0"
        :indeterminate="props.percent === null"
      />
    </template>

    <Alert v-if="props.error" variant="destructive">
      {{ props.error }}
    </Alert>
  </div>
</template>
