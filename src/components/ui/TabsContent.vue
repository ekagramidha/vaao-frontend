<script setup lang="ts">
import { TabsContent as RekaTabsContent } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; class?: string }>();
</script>

<template>
  <RekaTabsContent :value="props.value" :class="cn('outline-none', props.class)">
    <slot />
  </RekaTabsContent>
</template>
