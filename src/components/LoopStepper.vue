<script setup lang="ts">
import { computed, type Component } from 'vue';
import { AlertTriangle, Check, Lock } from 'lucide-vue-next';
import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * The optimizer loop, as steps that report their own state.
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
 *
 * Steps sharing a `group` render inside one card, divided rather than
 * separated. The brief describes three loops, and generating a suite then
 * running it are two actions within one of them — four equal cards would read
 * as four loops. They stay independently actionable because they carry
 * different staleness: a suite can be current while its last score was measured
 * against a configuration two versions ago, and that warning is the single most
 * useful thing this component says.
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
  /**
   * Steps sharing this render in one card, in order. Omit for a step that
   * stands alone.
   */
  group?: string;
}

const props = defineProps<{ steps: LoopStep[]; anyBusy: boolean }>();
const emit = defineEmits<{ run: [key: string] }>();

const STATE_BADGE: Record<StepState, { label: string; variant: 'pass' | 'medium' | 'outline' | 'secondary' }> = {
  done: { label: 'Done', variant: 'pass' },
  stale: { label: 'Out of date', variant: 'medium' },
  pending: { label: 'Not run', variant: 'outline' },
  locked: { label: 'Locked', variant: 'outline' },
};

/**
 * Consecutive steps sharing a `group` collapse into one card.
 *
 * Only consecutive ones, so the array order stays the single source of
 * sequence — a group key cannot silently reorder the loop.
 */
const groups = computed<LoopStep[][]>(() => {
  const result: LoopStep[][] = [];

  for (const step of props.steps) {
    const previous = result.at(-1);
    if (step.group && previous?.[0]?.group === step.group) {
      previous.push(step);
    } else {
      result.push([step]);
    }
  }

  return result;
});
</script>

<template>
  <!--
    Three cards on a wide viewport, and the grouped one claims the two columns
    its members would have taken, so the row is the same height and width as
    before — only the boundaries move.
  -->
  <ol class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <li
      v-for="(group, groupIndex) in groups"
      :key="group[0].key"
      :class="
        cn(
          'flex flex-col overflow-hidden rounded-lg border sm:col-span-2',
          group.length === 1 && 'lg:col-span-1',
          // Vertical rule between members side by side; horizontal once they
          // stack, where a vertical one would divide nothing.
          group.length > 1 && 'divide-y sm:flex-row sm:divide-x sm:divide-y-0',
          // The outline goes on the card, which is the element that owns the
          // rounded corners. An inset ring drawn on an inner half is a plain
          // rectangle, so `overflow-hidden` clips its outer corners against the
          // card's radius and it reads as a broken border.
          group.some((step) => step.isNext) && 'border-primary/40',
        )
      "
    >
      <div
        v-for="(step, stepIndex) in group"
        :key="step.key"
        :class="
          cn(
            'flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3 transition-colors',
            // Which half, once the card outline has said which loop. Tint only
            // — the filled button below carries the rest of the emphasis.
            step.isNext && 'bg-accent/50',
            step.state === 'locked' && 'opacity-60',
          )
        "
      >
        <div class="flex items-center gap-2">
          <!--
            Numbered by group, and only on its first member. The number belongs
            to the loop, not the action: repeating it on the second half reads
            as a duplicate rather than as a continuation, and re-introducing a
            sub-label like 2b would undo the point of merging the cards.
          -->
          <span
            v-if="stepIndex === 0"
            class="text-[11px] font-semibold tabular-nums text-muted-foreground"
          >
            {{ groupIndex + 1 }}
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
      </div>
    </li>
  </ol>
</template>
