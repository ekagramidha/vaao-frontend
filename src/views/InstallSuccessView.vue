<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next';
</script>

<template>
  <section class="mx-auto flex max-w-2xl flex-col gap-6 py-12">
    <div class="space-y-3">
      <div class="flex size-11 items-center justify-center rounded-md bg-pass/10 text-pass">
        <CheckCircle2 class="size-6" />
      </div>

      <div class="space-y-2">
        <h1 class="text-xl font-semibold tracking-tight">Installation complete</h1>
        <p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
          The optimizer is connected to this HighLevel sub-account.
        </p>
      </div>
    </div>
  </section>
</template>
