<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

/**
 * A single composed dialog rather than the full set of shadcn sub-components.
 *
 * Every dialog in this widget is the same shape — a titled panel holding a
 * transcript or a diff — so exposing eight primitives to assemble that each
 * time would be ceremony without benefit.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    /** `lg` suits transcripts, `xl` suits side-by-side prompt diffs. */
    size?: 'md' | 'lg' | 'xl';
    class?: string;
  }>(),
  { size: 'lg' },
);

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-6xl',
} as const;
</script>

<template>
  <DialogRoot :open="props.open" @update:open="(value) => emit('update:open', value)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <DialogContent
        :class="
          cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-xl outline-none',
            SIZES[props.size],
            props.class,
          )
        "
      >
        <header class="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div class="min-w-0">
            <DialogTitle class="truncate text-sm font-semibold">{{ props.title }}</DialogTitle>
            <DialogDescription v-if="props.description" class="mt-0.5 text-xs text-muted-foreground">
              {{ props.description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X class="size-4" />
          </DialogClose>
        </header>

        <!--
          `grow` rather than `flex-1`. `flex-1` is shorthand for `flex: 1 1 0%`,
          and this panel has no definite height — only a max-height — so a
          flex-basis of 0 contributes nothing to the container's height, leaves
          no free space for grow to claim, and collapses the body to 0px. With
          `overflow-y-auto` that silently clips the entire transcript.
          `grow` keeps flex-basis at auto: the body sizes to its content, grows
          into spare room, and `min-h-0` lets it shrink and scroll once
          max-height caps the panel.
        -->
        <div class="min-h-0 grow overflow-y-auto px-5 py-4">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="border-t px-5 py-3">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
