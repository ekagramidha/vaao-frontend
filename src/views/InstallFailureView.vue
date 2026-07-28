<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { AlertTriangle, LifeBuoy } from 'lucide-vue-next';
import { Alert } from '@/components/ui';

const route = useRoute();

const errorMessage = computed(() => {
  const fromRoute = typeof route.query.error === 'string' ? route.query.error : undefined;
  const fromWindow = new URLSearchParams(window.location.search).get('error') ?? undefined;
  return fromRoute ?? fromWindow ?? 'HighLevel did not return an error code.';
});

</script>

<template>
  <section class="mx-auto flex max-w-2xl flex-col gap-6 py-12">
    <div class="space-y-3">
      <div class="flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
        <AlertTriangle class="size-6" />
      </div>

      <div class="space-y-2">
        <h1 class="text-xl font-semibold tracking-tight">Installation did not finish</h1>
        <p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
          HighLevel could not complete the authorization step, so the optimizer does not have access
          to this sub-account yet.
        </p>
      </div>
    </div>

    <Alert variant="destructive">
      <div class="space-y-1">
        <p class="text-xs font-medium">HighLevel response</p>
        <p class="break-words font-mono-tight">{{ errorMessage }}</p>
      </div>
    </Alert>

    <Alert variant="muted">
      <div class="flex gap-2">
        <LifeBuoy class="mt-0.5 size-4 shrink-0" />
        <p>
          This usually means the Marketplace app redirect URL did not match the backend callback URL,
          or the requested scopes were not approved during install.
        </p>
      </div>
    </Alert>
  </section>
</template>
