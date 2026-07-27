<script setup lang="ts">
import { FlaskConical } from 'lucide-vue-next';
import { Alert } from '@/components/ui';

/**
 * States plainly that a score came from a simulation, not a phone call.
 *
 * This gets the same treatment as the advisory recommendation badge, and for
 * the same reason: the credibility of everything else in the product depends on
 * not overstating what a number means. A test run is a caller-persona model
 * talking to the agent's real prompt through a different underlying model. It
 * cannot see HighLevel's own prompt scaffolding, its choice of model, real tool
 * execution, speech recognition, or the merge fields HighLevel substitutes at
 * call time — so a passing score is evidence the instructions read well, not
 * proof the live agent behaves that way.
 *
 * `variant="inline"` is for places that already sit inside a bordered panel and
 * only need the sentence.
 */
const props = withDefaults(
  defineProps<{
    /** Adds the sentence about deltas being more meaningful than absolutes. */
    explainDelta?: boolean;
    variant?: 'panel' | 'inline';
  }>(),
  { explainDelta: false, variant: 'panel' },
);
</script>

<template>
  <p
    v-if="props.variant === 'inline'"
    class="flex items-start gap-1.5 text-[11px] text-muted-foreground"
  >
    <FlaskConical class="mt-0.5 size-3 shrink-0" />
    <span>
      Simulated, not a phone call — no speech recognition, no real tool execution, and merge fields
      unresolved.
    </span>
  </p>

  <Alert v-else variant="advisory">
    <div class="flex gap-2">
      <FlaskConical class="mt-0.5 size-3.5 shrink-0" />
      <div class="space-y-1 text-xs">
        <p>
          <span class="font-medium">These scores are simulated, not phone calls.</span>
          A caller-persona model talks to this agent's real prompt through a different underlying
          model than HighLevel runs. It does not see HighLevel's own prompt scaffolding, execute
          real actions, transcribe speech, or resolve merge fields.
        </p>
        <p v-if="props.explainDelta">
          Treat this as a check that the instructions hold up, not as proof the live agent behaves
          this way. For that, run the cases yourself on a real call, or compare analyses of real
          transcripts once new calls have come in.
        </p>
      </div>
    </div>
  </Alert>
</template>
