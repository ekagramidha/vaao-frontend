<script setup lang="ts">
import type { Component } from 'vue';

/**
 * Empty states carry the next action rather than only announcing absence.
 *
 * Every loop in this product depends on the one before it, so "no test cases
 * yet" is nearly always answered by "run an analysis first" — and saying so is
 * the difference between a dead end and a workflow.
 */
defineProps<{
  icon?: Component;
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
    <component :is="icon" v-if="icon" class="size-5 text-muted-foreground" />
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="mx-auto max-w-md text-xs text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.default" class="pt-1">
      <slot />
    </div>
  </div>
</template>
