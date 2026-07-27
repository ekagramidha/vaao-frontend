<script setup lang="ts">
import { ref } from 'vue';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { ChevronRight } from 'lucide-vue-next';
// Imported directly rather than through ./index to avoid a circular import,
// since index re-exports this component.
import Badge from './Badge.vue';
import { cn } from '@/lib/utils';

/**
 * A titled, collapsible group of content.
 *
 * Exists because several screens stack two or more lists that mean different
 * things — proposals awaiting a decision versus ones already decided, issues
 * versus the transcripts they came from. A small bold label is not enough
 * separation for that: the reader has to work out where one group ends. A real
 * heading with a count, and the ability to fold away whatever is not currently
 * relevant, does the job.
 *
 * Uncontrolled by design. Every caller so far only needs "start open" or
 * "start closed", and threading state up would add nothing.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    /** Rendered as a badge beside the title. */
    count?: number;
    /** Short right-aligned breakdown, e.g. "2 applied · 1 dismissed". */
    summary?: string;
    defaultOpen?: boolean;
    /**
     * `secondary` de-emphasises the whole block, for content that is history
     * rather than something needing attention.
     */
    tone?: 'default' | 'secondary';
    /**
     * Set false when the slot content is already a bordered or divided list,
     * so it can sit flush against the section's own border instead of being
     * inset inside a second frame.
     */
    padded?: boolean;
    class?: string;
  }>(),
  { defaultOpen: true, tone: 'default', padded: true },
);

const open = ref(props.defaultOpen);
</script>

<template>
  <CollapsibleRoot v-model:open="open" :class="cn('rounded-lg border', props.class)">
    <CollapsibleTrigger
      :class="
        cn(
          'flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-left transition-colors',
          'hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
          props.tone === 'secondary' && 'bg-muted/30',
          open && 'rounded-b-none',
        )
      "
    >
      <ChevronRight
        :class="
          cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-90',
          )
        "
      />

      <h3
        :class="
          cn(
            'text-sm font-semibold tracking-tight',
            props.tone === 'secondary' && 'text-muted-foreground',
          )
        "
      >
        {{ props.title }}
      </h3>

      <Badge v-if="props.count !== undefined" :variant="props.tone === 'secondary' ? 'outline' : 'secondary'">
        {{ props.count }}
      </Badge>

      <span v-if="props.summary" class="ml-auto text-[11px] text-muted-foreground">
        {{ props.summary }}
      </span>
    </CollapsibleTrigger>

    <CollapsibleContent>
      <div :class="cn('border-t', props.padded && 'space-y-3 p-4')">
        <slot />
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
