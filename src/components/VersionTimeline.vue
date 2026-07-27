<script setup lang="ts">
import { CornerUpLeft, GitCommitVertical } from 'lucide-vue-next';
import { Badge, Button } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { fieldLabel } from '@/lib/labels';
import type { AgentVersion } from '@/types/api';

/**
 * Configuration history, newest first.
 *
 * Attribution is the point: a version written by an apply reads differently
 * from one written because somebody edited the agent in HighLevel behind our
 * back, and both need to be visible for the audit story to hold.
 */
const props = defineProps<{
  versions: AgentVersion[];
  currentVersion: number;
  busy?: boolean;
}>();

const emit = defineEmits<{ rollback: [version: number] }>();

const SOURCE_LABELS: Record<AgentVersion['source'], string> = {
  ghl_sync: 'Changed in HighLevel',
  optimizer_apply: 'Applied by optimizer',
  rollback: 'Rolled back',
};

const SOURCE_VARIANTS: Record<AgentVersion['source'], 'outline' | 'pass' | 'medium'> = {
  ghl_sync: 'outline',
  optimizer_apply: 'pass',
  rollback: 'medium',
};
</script>

<template>
  <ol class="space-y-0">
    <li
      v-for="(version, index) in props.versions"
      :key="version.id"
      class="relative flex gap-3 pb-5"
    >
      <!-- Connector, omitted on the last entry -->
      <span
        v-if="index < props.versions.length - 1"
        class="absolute top-6 left-[7px] h-full w-px bg-border"
        aria-hidden="true"
      />

      <GitCommitVertical class="relative z-10 mt-0.5 size-4 shrink-0 bg-background text-muted-foreground" />

      <div class="min-w-0 flex-1 space-y-1.5">
        <!--
          Metadata left, action right on the same row. The restore button used
          to sit below the entry, which cost a line of vertical space per
          version and pushed the timeline long enough to scroll on an agent
          with any real history.
        -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="text-sm font-medium tabular-nums">v{{ version.version }}</span>
            <Badge :variant="SOURCE_VARIANTS[version.source]">
              {{ SOURCE_LABELS[version.source] }}
            </Badge>
            <Badge v-if="version.version === props.currentVersion" variant="default">Current</Badge>
            <span class="text-[11px] text-muted-foreground">
              {{ formatDateTime(version.createdAt) }}
            </span>
          </div>

          <Button
            v-if="version.version !== props.currentVersion"
            variant="outline"
            size="sm"
            class="-mt-1 shrink-0"
            :disabled="props.busy"
            @click="emit('rollback', version.version)"
          >
            <CornerUpLeft />
            Restore
          </Button>
        </div>

        <p v-if="version.note" class="text-xs text-muted-foreground">{{ version.note }}</p>

        <div v-if="version.changedFields.length" class="flex flex-wrap gap-1">
          <span
            v-for="field in version.changedFields"
            :key="field"
            class="rounded bg-muted px-1.5 py-0.5 text-[11px]"
          >
            {{ fieldLabel(field) }}
          </span>
        </div>
      </div>
    </li>
  </ol>
</template>
