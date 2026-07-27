<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AlertCircle, Bot, ChevronRight } from 'lucide-vue-next';
import EmptyState from '@/components/EmptyState.vue';
import { Alert, Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { useAgentsStore } from '@/stores/agents';
import { useOptimizerStore } from '@/stores/optimizer';
import { locationId } from '@/services/embed';

/**
 * Entry point: the sub-account's Voice AI agents.
 *
 * A list rather than an auto-redirect to the first agent, because an agency
 * sub-account usually has several and the useful first question is "which of
 * these is underperforming", not "here is one of them".
 */
const agentsStore = useAgentsStore();
const optimizerStore = useOptimizerStore();
const router = useRouter();

onMounted(async () => {
  if (agentsStore.agents.length === 0) await agentsStore.loadAgents();
});

async function open(agentId: string): Promise<void> {
  optimizerStore.clear();
  agentsStore.selectAgent(agentId);
  await router.push({ name: 'agent', params: { agentId } });
}
</script>

<template>
  <div class="space-y-5">
    <header class="space-y-1">
      <h1 class="text-lg font-semibold tracking-tight">Voice AI agents</h1>
      <p class="text-xs text-muted-foreground">
        Analyse past calls, generate test cases, and apply configuration improvements.
      </p>
    </header>

    <Alert v-if="!locationId" variant="destructive">
      No sub-account was supplied. Open the optimizer from inside HighLevel, or set
      <code class="font-mono-tight">VITE_DEFAULT_LOCATION_ID</code> for standalone development.
    </Alert>

    <Alert v-else-if="agentsStore.error" variant="destructive">
      <div class="flex gap-2">
        <AlertCircle class="mt-0.5 size-4 shrink-0" />
        <p>{{ agentsStore.error }}</p>
      </div>
    </Alert>

    <div v-if="agentsStore.isLoadingAgents && !agentsStore.agents.length" class="space-y-2">
      <Skeleton v-for="index in 3" :key="index" class="h-20 w-full" />
    </div>

    <EmptyState
      v-else-if="!agentsStore.agents.length"
      :icon="Bot"
      title="No Voice AI agents in this sub-account"
      description="Create an agent in HighLevel under Conversation AI, place a test call, then come back."
    />

    <div v-else class="space-y-2">
      <Card
        v-for="agent in agentsStore.agents"
        :key="agent.ghlAgentId"
        class="cursor-pointer transition-colors hover:bg-accent/40"
        @click="open(agent.ghlAgentId)"
      >
        <CardContent class="flex items-center gap-4 pt-5">
          <div class="min-w-0 flex-1 space-y-1">
            <p class="truncate text-sm font-medium">{{ agent.agentName }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ agent.businessName || 'No business name' }}
            </p>
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline">v{{ agent.currentVersion }}</Badge>
              <Badge variant="outline">
                {{ agent.actions.length }} action{{ agent.actions.length === 1 ? '' : 's' }}
              </Badge>
              <Badge v-if="agent.language" variant="outline">{{ agent.language }}</Badge>
              <span class="text-[11px] text-muted-foreground">
                synced {{ formatRelative(agent.syncedAt) }}
              </span>
            </div>
          </div>
          <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
