<script setup lang="ts">
import { computed } from 'vue';
import {
  TooltipTrigger as RekaTooltipTrigger,
  type TooltipTriggerProps,
  useForwardProps,
} from 'reka-ui';
import { cn } from '@/lib/utils';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<TooltipTriggerProps & { class?: string }>();

const delegatedProps = computed(() => {
  const { class: _class, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <RekaTooltipTrigger v-bind="{ ...forwarded, ...$attrs }" :class="cn(props.class)">
    <slot />
  </RekaTooltipTrigger>
</template>
