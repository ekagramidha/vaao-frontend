<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { AlertCircle, RefreshCw, AudioLines } from 'lucide-vue-next';
import { Badge, Button } from '@/components/ui';
import { hasUnresolvedLocation, isEmbedded } from '@/services/embed';
import { useAgentsStore } from '@/stores/agents';

/**
 * Persistent chrome: product mark and data-source indicator.
 *
 * Kept intentionally low-contrast and short. The widget sits inside HighLevel's
 * own navigation, so a second heavy header would compete with theirs.
 */
const agentsStore = useAgentsStore();
const route = useRoute();

const currentAgentId = computed(() => route.params.agentId as string | undefined);
const requiresLocation = computed(() => route.meta.requiresLocation !== false);

async function resync(): Promise<void> {
  await agentsStore.resync();
  if (currentAgentId.value) await agentsStore.loadOverview(currentAgentId.value);
}
</script>

<template>
  <div class="flex min-h-full flex-col bg-background">
    <header class="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-5">
        <RouterLink to="/" class="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <AudioLines class="size-4" />
          Voice AI Agent Optimizer
        </RouterLink>

        <div class="ml-auto flex items-center gap-2">
          <!--
            Whether the data on screen came from HighLevel or the local mirror.
            Worth surfacing: "why is this stale" is almost always this.
          -->
          <Badge
            v-if="requiresLocation && agentsStore.source"
            variant="outline"
            class="hidden sm:inline-flex"
          >
            {{ agentsStore.source === 'ghl' ? 'Live from HighLevel' : 'Cached' }}
          </Badge>
          <Button
            v-if="requiresLocation"
            variant="ghost"
            size="sm"
            :loading="agentsStore.isLoadingAgents"
            @click="resync"
          >
            <RefreshCw v-if="!agentsStore.isLoadingAgents" />
            Re-sync
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
      <!--
        No sub-account resolved. There is no default to fall back to, by
        design: one would turn a mistyped merge field from an error into
        silently serving somebody else's agents. Rendering the app anyway would
        fire every request without a location header and produce a wall of
        failures naming the wrong problem, so the cause is stated instead.
      -->
      <div
        v-if="requiresLocation && hasUnresolvedLocation"
        class="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center"
      >
        <AlertCircle class="size-8 text-advisory" />
        <p class="text-sm font-semibold">Could not tell which sub-account this is</p>

        <p v-if="isEmbedded" class="text-xs leading-relaxed text-muted-foreground">
          The optimizer reads the sub-account from a merge field on its menu link. Open
          <span class="font-medium text-foreground">Settings → Custom Menu Links</span>, edit this
          link, and make sure its URL ends with
          <code class="rounded bg-muted px-1 py-0.5 font-mono-tight">?locationId=</code> followed by
          the location id merge field.
        </p>

        <p v-else class="text-xs leading-relaxed text-muted-foreground">
          Add the sub-account to the URL:
          <code class="rounded bg-muted px-1 py-0.5 font-mono-tight">?locationId=&lt;id&gt;</code>.
          Running outside HighLevel uses the same query parameter the embed does, so there is one
          path to get wrong instead of two.
        </p>
      </div>

      <slot v-else />
    </main>
  </div>
</template>
