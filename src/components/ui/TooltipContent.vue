<script setup lang="ts">
import { computed } from 'vue';
import {
  TooltipArrow,
  TooltipContent as RekaTooltipContent,
  TooltipPortal,
  type TooltipContentEmits,
  type TooltipContentProps,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/utils';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: string }>(),
  { side: 'top', sideOffset: 8 },
);
const emits = defineEmits<TooltipContentEmits>();

const delegatedProps = computed(() => {
  const { class: _class, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TooltipPortal>
    <RekaTooltipContent
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'z-50 max-w-xs overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs leading-relaxed text-popover-foreground shadow-md',
          'border-black bg-black text-white shadow-lg',
          props.class,
        )
      "
    >
      <slot />
      <TooltipArrow class="fill-black" :width="10" :height="5" />
    </RekaTooltipContent>
  </TooltipPortal>
</template>
