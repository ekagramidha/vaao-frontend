<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { TranscriptTurn } from '@/types/api';

/**
 * Renders a call transcript, real or simulated.
 *
 * Turn indices are shown because they are the addressing scheme the whole
 * system uses — an issue cites turn 14, and the reviewer needs to be able to
 * find turn 14. Interruptions are marked because "handles barge-in" is a
 * scored criterion, so the evidence for it has to be visible.
 */
const props = withDefaults(
  defineProps<{
    turns: TranscriptTurn[];
    /** Turn to draw attention to, e.g. the one a criterion was decided on. */
    highlightIndex?: number | null;
  }>(),
  { highlightIndex: null },
);
</script>

<template>
  <ol class="space-y-2">
    <li
      v-for="turn in props.turns"
      :key="turn.index"
      :class="
        cn(
          'flex gap-3 rounded-md px-3 py-2 transition-colors',
          turn.speaker === 'agent' ? 'bg-muted/40' : 'bg-transparent',
          props.highlightIndex === turn.index && 'ring-2 ring-ring/50',
        )
      "
    >
      <span class="w-6 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-muted-foreground">
        {{ turn.index }}
      </span>

      <div class="min-w-0 flex-1">
        <div class="mb-0.5 flex items-center gap-2">
          <span
            :class="
              cn(
                'text-[11px] font-semibold tracking-wide uppercase',
                turn.speaker === 'agent' ? 'text-foreground' : 'text-muted-foreground',
              )
            "
          >
            {{ turn.speaker === 'agent' ? 'Agent' : 'Caller' }}
          </span>
          <span v-if="turn.interrupted" class="text-[11px] text-severity-medium">
            cut off
          </span>
          <span v-else-if="turn.continuesPrevious" class="text-[11px] text-muted-foreground">
            resumes
          </span>
        </div>
        <p class="font-mono-tight break-words whitespace-pre-wrap">{{ turn.text }}</p>
      </div>
    </li>
  </ol>
</template>
