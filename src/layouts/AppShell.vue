<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertCircle, ChevronDown, RefreshCw, Waves } from 'lucide-vue-next';
import { Badge, Button } from '@/components/ui';
import { hasUnresolvedLocation } from '@/services/embed';
import { useAgentsStore } from '@/stores/agents';
import { useOptimizerStore } from '@/stores/optimizer';

/**
 * Persistent chrome: product mark, agent switcher, data-source indicator.
 *
 * Kept intentionally low-contrast and short. The widget sits inside HighLevel's
 * own navigation, so a second heavy header would compete with theirs.
 */
const agentsStore = useAgentsStore();
const optimizerStore = useOptimizerStore();
const route = useRoute();
const router = useRouter();

const currentAgentId = computed(() => route.params.agentId as string | undefined);

const currentAgentName = computed(() => {
  const id = currentAgentId.value;
  if (!id) return null;
  return agentsStore.agents.find((agent) => agent.ghlAgentId === id)?.agentName ?? null;
});

async function switchAgent(event: Event): Promise<void> {
  const agentId = (event.target as HTMLSelectElement).value;
  if (!agentId || agentId === currentAgentId.value) return;

  optimizerStore.clear();
  agentsStore.selectAgent(agentId);
  await router.push({ name: 'agent', params: { agentId } });
}

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
          <Waves class="size-4" />
          Agent Optimizer
        </RouterLink>

        <div v-if="currentAgentId" class="relative ml-3 min-w-0">
          <select
            class="h-8 max-w-[16rem] appearance-none truncate rounded-md border bg-background pr-8 pl-3 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            :value="currentAgentId"
            :aria-label="`Current agent: ${currentAgentName ?? 'unknown'}`"
            @change="switchAgent"
          >
            <option
              v-for="agent in agentsStore.agents"
              :key="agent.ghlAgentId"
              :value="agent.ghlAgentId"
            >
              {{ agent.agentName }}
            </option>
          </select>
          <ChevronDown
            class="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        <div class="ml-auto flex items-center gap-2">
          <!--
            Whether the data on screen came from HighLevel or the local mirror.
            Worth surfacing: "why is this stale" is almost always this.
          -->
          <Badge v-if="agentsStore.source" variant="outline" class="hidden sm:inline-flex">
            {{ agentsStore.source === 'ghl' ? 'Live from HighLevel' : 'Cached' }}
          </Badge>
          <Button
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
        Embedded, but no sub-account was resolved. Almost always a merge field
        missing from the Custom Menu Link URL. Rendering the app anyway would
        fire every request without a location header and show a wall of
        failures that name the wrong problem, so the cause is stated instead.
      -->
      <div
        v-if="hasUnresolvedLocation"
        class="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center"
      >
        <AlertCircle class="size-8 text-advisory" />
        <p class="text-sm font-semibold">Could not tell which sub-account this is</p>
        <p class="text-xs leading-relaxed text-muted-foreground">
          The optimizer reads the sub-account from a merge field on its menu link. Open
          <span class="font-medium text-foreground">Settings → Custom Menu Links</span>, edit this
          link, and make sure its URL ends with
          <code class="rounded bg-muted px-1 py-0.5 font-mono-tight">?locationId=</code> followed by
          the location id merge field.
        </p>
      </div>

      <slot v-else />
    </main>
  </div>
</template>
