<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Severity and verdict variants read from the theme's semantic tokens, so the
 * colour of "critical" is defined once in index.css rather than per component.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-muted-foreground',
        critical: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
        high: 'border-severity-high/25 bg-severity-high/10 text-severity-high',
        medium: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
        low: 'border-severity-low/25 bg-severity-low/10 text-severity-low',
        pass: 'border-pass/25 bg-pass/10 text-pass',
        fail: 'border-fail/25 bg-fail/10 text-fail',
        errored: 'border-errored/25 bg-errored/10 text-errored',
        advisory: 'border-advisory/25 bg-advisory/10 text-advisory',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

const props = defineProps<{
  variant?: BadgeVariants['variant'];
  class?: string;
}>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </span>
</template>
