import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/services/api';
import type { Agent, AgentOverview, AgentVersion, RollbackResult } from '@/types/api';

/**
 * Agent selection, the dashboard overview payload, and version history.
 *
 * Loading and error state live here rather than in components, so any view can
 * render the same agent without each one re-fetching or inventing its own
 * spinner logic.
 */
export const useAgentsStore = defineStore('agents', () => {
  const agents = ref<Agent[]>([]);
  const overview = ref<AgentOverview | null>(null);
  const versions = ref<AgentVersion[]>([]);

  const selectedAgentId = ref<string | null>(null);
  const isLoadingAgents = ref(false);
  const isLoadingOverview = ref(false);
  const error = ref<string | null>(null);
  /** Whether the last agent read came from HighLevel or the local mirror. */
  const source = ref<'ghl' | 'cache' | null>(null);

  const selectedAgent = computed(
    () => agents.value.find((agent) => agent.ghlAgentId === selectedAgentId.value) ?? null,
  );

  function capture(caught: unknown, fallback: string): void {
    error.value = caught instanceof Error ? caught.message : fallback;
  }

  async function loadAgents(): Promise<void> {
    isLoadingAgents.value = true;
    error.value = null;
    try {
      const result = await api.listAgents();
      agents.value = result.data;
      source.value = result.meta?.source ?? null;

      // Select the first agent so the dashboard is never empty on first open.
      if (!selectedAgentId.value && result.data.length > 0) {
        selectedAgentId.value = result.data[0].ghlAgentId;
      }
    } catch (caught) {
      capture(caught, 'Could not load agents.');
    } finally {
      isLoadingAgents.value = false;
    }
  }

  async function resync(): Promise<void> {
    isLoadingAgents.value = true;
    try {
      const result = await api.syncAgents();
      agents.value = result.data;
      source.value = 'ghl';
    } catch (caught) {
      capture(caught, 'Could not re-sync agents from HighLevel.');
    } finally {
      isLoadingAgents.value = false;
    }
  }

  async function loadOverview(agentId: string): Promise<void> {
    isLoadingOverview.value = true;
    try {
      const { data } = await api.getOverview(agentId);
      overview.value = data;
    } catch (caught) {
      capture(caught, 'Could not load the agent overview.');
    } finally {
      isLoadingOverview.value = false;
    }
  }

  async function loadVersions(agentId: string): Promise<void> {
    try {
      const { data } = await api.listVersions(agentId);
      versions.value = data;
    } catch (caught) {
      capture(caught, 'Could not load version history.');
    }
  }

  /** Restores a previous configuration, then refreshes everything it affects. */
  async function rollback(agentId: string, version: number): Promise<RollbackResult | null> {
    try {
      const { data } = await api.rollback(agentId, version);
      await Promise.all([loadAgents(), loadOverview(agentId), loadVersions(agentId)]);
      return data;
    } catch (caught) {
      capture(caught, 'Could not roll back.');
      return null;
    }
  }

  function selectAgent(agentId: string): void {
    selectedAgentId.value = agentId;
    overview.value = null;
    versions.value = [];
  }

  return {
    agents,
    overview,
    versions,
    selectedAgentId,
    selectedAgent,
    isLoadingAgents,
    isLoadingOverview,
    error,
    source,
    loadAgents,
    resync,
    loadOverview,
    loadVersions,
    rollback,
    selectAgent,
  };
});
