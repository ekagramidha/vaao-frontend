<script setup lang="ts">
import { computed } from 'vue';
import { Archive, Target, UserRound } from 'lucide-vue-next';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { criterionTypeLabel, testCaseTypeLabel } from '@/lib/labels';
import type { TestCase } from '@/types/api';

/**
 * One generated test case.
 *
 * The caller persona's behaviours are shown in full rather than summarised,
 * because they are what the simulation actually executes — "interrupts the
 * agent mid-sentence" is the difference between a test and a description of one.
 */
const props = defineProps<{ testCase: TestCase; busy?: boolean }>();

const emit = defineEmits<{ archive: [testCase: TestCase] }>();

const isEdgeCase = computed(() => props.testCase.type === 'edge_case');
const mustPassCount = computed(
  () => props.testCase.successCriteria.filter((criterion) => criterion.mustPass).length,
);
</script>

<template>
  <Card>
    <CardContent class="space-y-3 pt-5">
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="isEdgeCase ? 'medium' : 'secondary'">
              {{ testCaseTypeLabel(props.testCase.type) }}
            </Badge>
            <Badge v-if="props.testCase.derivedFromIssueIds.length" variant="outline">
              Targets {{ props.testCase.derivedFromIssueIds.length }} known issue{{
                props.testCase.derivedFromIssueIds.length === 1 ? '' : 's'
              }}
            </Badge>
          </div>
          <p class="text-sm font-medium">{{ props.testCase.title }}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          :disabled="props.busy"
          :aria-label="`Archive ${props.testCase.title}`"
          @click="emit('archive', props.testCase)"
        >
          <Archive />
        </Button>
      </div>

      <p class="text-xs leading-relaxed text-muted-foreground">{{ props.testCase.scenario }}</p>

      <div class="rounded-md border bg-muted/30 px-3 py-2.5">
        <div class="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-muted-foreground">
          <UserRound class="size-3" />
          Caller
        </div>
        <p class="text-xs">
          <span class="font-medium">{{ props.testCase.callerPersona.name }}</span>
          — {{ props.testCase.callerPersona.role }},
          {{ props.testCase.callerPersona.mood }}.
          {{ props.testCase.callerPersona.goal }}
        </p>
        <p class="mt-1.5 font-mono-tight text-muted-foreground">
          “{{ props.testCase.callerPersona.openingLine }}”
        </p>
        <ul
          v-if="props.testCase.callerPersona.behaviours.length"
          class="mt-2 space-y-0.5 text-xs text-muted-foreground"
        >
          <li
            v-for="(behaviour, index) in props.testCase.callerPersona.behaviours"
            :key="index"
            class="flex gap-1.5"
          >
            <span class="text-foreground">·</span>{{ behaviour }}
          </li>
        </ul>
      </div>

      <div>
        <div class="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-muted-foreground">
          <Target class="size-3" />
          Success criteria
          <span v-if="mustPassCount" class="normal-case">
            · {{ mustPassCount }} must pass
          </span>
        </div>
        <ul class="divide-y rounded-md border">
          <li
            v-for="criterion in props.testCase.successCriteria"
            :key="criterion.key"
            class="flex items-start gap-2 px-3 py-2"
          >
            <span class="w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground">
              w{{ criterion.weight }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium">
                {{ criterion.label }}
                <Badge v-if="criterion.mustPass" variant="critical" class="ml-1">Must pass</Badge>
              </p>
              <p class="text-xs text-muted-foreground">{{ criterion.description }}</p>
            </div>
            <Badge variant="outline">{{ criterionTypeLabel(criterion.type) }}</Badge>
          </li>
        </ul>
      </div>
    </CardContent>
  </Card>
</template>
