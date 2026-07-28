<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { AlertCircle, Bot, ChevronRight } from 'lucide-vue-next';
import EmptyState from '@/components/EmptyState.vue';
import {
  Alert,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { useAgentsStore } from '@/stores/agents';
import { useOptimizerStore } from '@/stores/optimizer';

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

const page = ref(1);
const pageSize = 10;

const sortedAgents = computed(() =>
  [...agentsStore.agents].sort((left, right) =>
    left.agentName.localeCompare(right.agentName, undefined, { sensitivity: 'base' }),
  ),
);

const totalAgents = computed(() => sortedAgents.value.length);
const pageCount = computed(() => Math.max(1, Math.ceil(totalAgents.value / pageSize)));
const startIndex = computed(() => (page.value - 1) * pageSize);
const pageAgents = computed(() =>
  sortedAgents.value.slice(startIndex.value, startIndex.value + pageSize),
);
const visibleRange = computed(() => {
  if (totalAgents.value === 0) return '0–0';
  const start = startIndex.value + 1;
  const end = Math.min(startIndex.value + pageSize, totalAgents.value);
  return `${start}–${end}`;
});

watch(totalAgents, () => {
  if (page.value > pageCount.value) page.value = pageCount.value;
});

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

    <!--
      No "missing sub-account" branch here. AppShell resolves that before the
      router view renders at all, so a copy of the check in this view would be
      unreachable and would drift out of step with the one that runs.
    -->
    <Alert v-if="agentsStore.error" variant="destructive">
      <div class="flex gap-2">
        <AlertCircle class="mt-0.5 size-4 shrink-0" />
        <p>{{ agentsStore.error }}</p>
      </div>
    </Alert>

    <div v-if="agentsStore.isLoadingAgents && !agentsStore.agents.length" class="space-y-2">
      <div class="rounded-lg border bg-card">
        <div class="border-b px-5 py-3">
          <Skeleton class="h-4 w-44" />
        </div>
        <div class="space-y-2 px-5 py-4">
          <Skeleton v-for="index in 6" :key="index" class="h-8 w-full" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="!agentsStore.agents.length"
      :icon="Bot"
      title="No Voice AI agents in this sub-account"
      description="Create an agent in HighLevel under Conversation AI, place a test call, then come back."
    />

    <div v-else class="space-y-3">
      <div class="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader class="bg-muted/30 text-xs">
            <TableRow class="hover:bg-transparent">
              <TableHead class="px-5 py-3">Agent</TableHead>
              <TableHead class="hidden px-5 py-3 sm:table-cell">Business</TableHead>
              <TableHead class="hidden px-5 py-3 md:table-cell">Version</TableHead>
              <TableHead class="hidden px-5 py-3 md:table-cell">Actions</TableHead>
              <TableHead class="hidden px-5 py-3 lg:table-cell">Language</TableHead>
              <TableHead class="px-5 py-3">Synced</TableHead>
              <TableHead class="w-10 px-5 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="agent in pageAgents"
              :key="agent.ghlAgentId"
              class="cursor-pointer hover:bg-accent/40"
              role="button"
              tabindex="0"
              @click="open(agent.ghlAgentId)"
              @keydown.enter.prevent="open(agent.ghlAgentId)"
              @keydown.space.prevent="open(agent.ghlAgentId)"
            >
              <TableCell class="max-w-[320px] px-5 py-3">
                <div class="truncate font-medium">{{ agent.agentName }}</div>
                <div class="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                  {{ agent.businessName || 'No business name' }}
                </div>
              </TableCell>
              <TableCell class="hidden max-w-[360px] px-5 py-3 text-muted-foreground sm:table-cell">
                <div class="truncate">{{ agent.businessName || 'No business name' }}</div>
              </TableCell>
              <TableCell class="hidden px-5 py-3 text-muted-foreground md:table-cell">
                v{{ agent.currentVersion }}
              </TableCell>
              <TableCell class="hidden px-5 py-3 text-muted-foreground md:table-cell">
                {{ agent.actions.length }}
              </TableCell>
              <TableCell class="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                {{ agent.language || '—' }}
              </TableCell>
              <TableCell class="px-5 py-3 text-muted-foreground">
                {{ formatRelative(agent.syncedAt) }}
              </TableCell>
              <TableCell class="px-5 py-3 text-right">
                <ChevronRight class="size-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>Showing {{ visibleRange }} of {{ totalAgents }}</p>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
          >
            Previous
          </Button>
          <span class="min-w-24 text-center">Page {{ page }} of {{ pageCount }}</span>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= pageCount"
            @click="page = Math.min(pageCount, page + 1)"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
