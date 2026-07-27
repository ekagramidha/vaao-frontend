<script setup lang="ts">
import type { Component } from 'vue';
import { AlertTriangle, Check, Lock } from 'lucide-vue-next';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * The optimizer loop, as four steps that report their own state.
 *
 * The earlier version was four buttons enabled purely by prerequisite, which
 * meant that after the first analysis everything unlocked and stayed unlocked
 * forever. Two problems with that: nothing indicated which step to do next, and
 * — worse — nothing indicated when a result had gone out of date. Applying a
 * recommendation silently invalidates the last test run, because that score was
 * measured against the previous configuration, and a button that looks
 * identical before and after is how a user comes to trust a stale number.
 *
 * So each step carries a state, exactly one is marked as next, and staleness is
 * surfaced rather than inferred by the user.
 */

export type StepState =
  /** A prerequisite is missing. `detail` says which. */
  | 'locked'
  /** Actionable and never run. */
  | 'pending'
  /** Run, and still valid. */
  | 'done'
  /** Run, but superseded by a later change. */
  | 'stale';

export interface LoopStep {
  key: string;
  label: string;
  icon: Component;
  state: StepState;
  /** One short line explaining the state — when it ran, or what is missing. */
  detail: string;
  /** The single recommended next action. */
  isNext: boolean;
  busy: boolean;
}

const props = defineProps<{ steps: LoopStep[]; anyBusy: boolean }>();
const emit = defineEmits<{ run: [key: string] }>();

const STATE_BADGE: Record<StepState, { label: string; variant: 'pass' | 'medium' | 'outline' | 'secondary' }> = {
  done: { label: 'Done', variant: 'pass' },
  stale: { label: 'Out of date', variant: 'medium' },
  pending: { label: 'Not run', variant: 'outline' },
  locked: { label: 'Locked', variant: 'outline' },
};
</script>

<template>
  <ol class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <li
      v-for="(step, index) in props.steps"
      :key="step.key"
      :class="
        cn(
          'flex flex-col gap-2 rounded-lg border px-3.5 py-3 transition-colors',
          // Only the recommended next step is emphasised. Everything else
          // recedes, so the eye lands on one action.
          step.isNext && 'border-primary/40 bg-accent/40',
          step.state === 'locked' && 'opacity-60',
        )
      "
    >
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {{ index + 1 }}
        </span>
        <component :is="step.icon" class="size-3.5 shrink-0 text-muted-foreground" />
        <Badge :variant="STATE_BADGE[step.state].variant" class="ml-auto gap-1">
          <Check v-if="step.state === 'done'" class="size-3" />
          <AlertTriangle v-else-if="step.state === 'stale'" class="size-3" />
          <Lock v-else-if="step.state === 'locked'" class="size-3" />
          {{ STATE_BADGE[step.state].label }}
        </Badge>
      </div>

      <div class="min-w-0 space-y-0.5">
        <p class="text-xs font-medium">{{ step.label }}</p>
        <p class="text-[11px] leading-snug text-muted-foreground">{{ step.detail }}</p>
      </div>

      <Button
        class="mt-auto w-full"
        size="sm"
        :variant="step.isNext ? 'default' : 'outline'"
        :loading="step.busy"
        :disabled="step.state === 'locked' || (props.anyBusy && !step.busy)"
        :title="step.state === 'locked' ? step.detail : undefined"
        @click="emit('run', step.key)"
      >
        {{ step.state === 'done' || step.state === 'stale' ? 'Run again' : step.label }}
      </Button>
    </li>
  </ol>
</template>
