<script setup lang="ts">
import {
  TooltipRoot as RekaTooltipRoot,
  type TooltipRootEmits,
  type TooltipRootProps,
  useForwardPropsEmits,
} from 'reka-ui';

const props = defineProps<TooltipRootProps>();
const emits = defineEmits<TooltipRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <RekaTooltipRoot v-bind="forwarded">
    <slot />
  </RekaTooltipRoot>
</template>
