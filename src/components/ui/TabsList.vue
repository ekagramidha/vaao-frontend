<script setup lang="ts">
import { TabsList as RekaTabsList } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string }>();
</script>

<template>
  <RekaTabsList
    :class="
      cn(
        'inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </RekaTabsList>
</template>
