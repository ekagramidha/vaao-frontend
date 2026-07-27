<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'border-destructive/25 bg-destructive/5 text-destructive',
      advisory: 'border-advisory/25 bg-advisory/5 text-advisory',
      muted: 'bg-muted/50 text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type AlertVariants = VariantProps<typeof alertVariants>;

const props = defineProps<{
  variant?: AlertVariants['variant'];
  class?: string;
}>();
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant: props.variant }), props.class)">
    <slot />
  </div>
</template>
