<script setup lang="ts">
import { computed } from 'vue';
import { collapseUnchanged, diffLines, summariseDiff } from '@/lib/diff';
import { cn } from '@/lib/utils';

/**
 * Unified before/after diff for long text fields, chiefly the agent prompt.
 *
 * Unchanged runs are collapsed so a three-line edit inside a 200-line prompt
 * reads as a three-line edit. That matters: a reviewer who has to scan the
 * whole prompt to find the change will approve without reading, which defeats
 * the point of asking them.
 */
const props = defineProps<{ before: string; after: string }>();

const lines = computed(() => diffLines(props.before, props.after));
const summary = computed(() => summariseDiff(lines.value));
const rendered = computed(() => collapseUnchanged(lines.value, 3));
</script>

<template>
  <div class="overflow-hidden rounded-md border">
    <div class="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs">
      <span class="font-medium">Prompt changes</span>
      <span class="text-pass tabular-nums">+{{ summary.added }}</span>
      <span class="text-fail tabular-nums">−{{ summary.removed }}</span>
      <span class="ml-auto text-muted-foreground">
        {{ props.before.length.toLocaleString() }} → {{ props.after.length.toLocaleString() }} chars
      </span>
    </div>

    <div class="max-h-[26rem] overflow-y-auto">
      <table class="w-full border-collapse">
        <tbody>
          <template v-for="(line, index) in rendered" :key="index">
            <tr v-if="line === 'gap'" class="select-none">
              <td colspan="3" class="bg-muted/30 px-3 py-1 text-center text-[11px] text-muted-foreground">
                unchanged
              </td>
            </tr>
            <tr
              v-else
              :class="
                cn(
                  line.op === 'added' && 'bg-pass/8',
                  line.op === 'removed' && 'bg-fail/8',
                )
              "
            >
              <td class="w-10 border-r px-2 py-0.5 text-right align-top text-[11px] tabular-nums text-muted-foreground select-none">
                {{ line.beforeLine ?? '' }}
              </td>
              <td class="w-10 border-r px-2 py-0.5 text-right align-top text-[11px] tabular-nums text-muted-foreground select-none">
                {{ line.afterLine ?? '' }}
              </td>
              <td class="px-3 py-0.5 align-top">
                <span
                  :class="
                    cn(
                      'font-mono-tight break-words whitespace-pre-wrap',
                      line.op === 'added' && 'text-pass',
                      line.op === 'removed' && 'text-fail',
                    )
                  "
                >
                  <span class="mr-1 select-none opacity-60">{{
                    line.op === 'added' ? '+' : line.op === 'removed' ? '−' : ' '
                  }}</span>{{ line.text || ' ' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
