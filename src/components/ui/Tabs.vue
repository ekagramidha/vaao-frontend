<script setup lang="ts">
import { TabsRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<{ modelValue?: string; defaultValue?: string; class?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <TabsRoot
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :class="cn('flex flex-col gap-4', props.class)"
    @update:model-value="(value) => $emit('update:modelValue', String(value))"
  >
    <slot />
  </TabsRoot>
</template>
