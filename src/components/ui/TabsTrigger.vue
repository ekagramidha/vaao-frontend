<script setup lang="ts">
import { TabsTrigger as RekaTabsTrigger } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; class?: string }>();
</script>

<template>
  <RekaTabsTrigger
    :value="props.value"
    :class="
      cn(
        'inline-flex items-center gap-1.5 rounded-md h-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors outline-none',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        'focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </RekaTabsTrigger>
</template>
