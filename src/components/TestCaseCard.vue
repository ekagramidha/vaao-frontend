<script setup lang="ts">
import { computed, ref } from 'vue';
import { Archive, Phone, Target, ThumbsDown, ThumbsUp, UserRound, X } from 'lucide-vue-next';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { criterionTypeLabel, testCaseTypeLabel } from '@/lib/labels';
import type { TestCase } from '@/types/api';

/**
 * One generated test case.
 *
 * The caller persona's behaviours are shown in full rather than summarised,
 * because they are what the simulation actually executes — "interrupts the
 * agent mid-sentence" is the difference between a test and a description of one.
 *
 * The case doubles as a script a person can run themselves by phoning the
 * agent. That verdict is worth more than the simulated one — it comes from
 * HighLevel's real runtime — so recording it is offered right here rather than
 * being buried somewhere separate.
 */
const props = defineProps<{ testCase: TestCase; busy?: boolean }>();

const emit = defineEmits<{
  archive: [testCase: TestCase];
  'record-manual': [testCase: TestCase, verdict: 'passed' | 'failed', note: string];
  'clear-manual': [testCase: TestCase];
}>();

const isEdgeCase = computed(() => props.testCase.type === 'edge_case');
const mustPassCount = computed(
  () => props.testCase.successCriteria.filter((criterion) => criterion.mustPass).length,
);

const note = ref('');

function record(verdict: 'passed' | 'failed'): void {
  emit('record-manual', props.testCase, verdict, note.value.trim());
  note.value = '';
}
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
            <!-- A real-call verdict outranks anything simulated, so it sits with the title -->
            <Badge
              v-if="props.testCase.manualRun"
              :variant="props.testCase.manualRun.verdict === 'passed' ? 'pass' : 'fail'"
              class="gap-1"
            >
              <Phone class="size-3" />
              Real call: {{ props.testCase.manualRun.verdict }}
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

      <!--
        Run it for real.

        Every automated verdict here comes from a text simulation against a
        model that is not the one HighLevel runs — no speech recognition, no
        real tool execution, no merge fields. Someone phoning the agent with
        this script produces the only evidence that does not carry those
        caveats, and it costs nothing but their time.
      -->
      <div class="rounded-md border border-dashed px-3 py-2.5">
        <div class="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide uppercase text-muted-foreground">
          <Phone class="size-3" />
          Try it on the real agent
        </div>

        <template v-if="props.testCase.manualRun">
          <p class="text-xs">
            <span
              class="font-medium"
              :class="props.testCase.manualRun.verdict === 'passed' ? 'text-pass' : 'text-fail'"
            >
              {{ props.testCase.manualRun.verdict === 'passed' ? 'Passed' : 'Failed' }}
            </span>
            <span class="text-muted-foreground">
              on a real call, {{ formatRelative(props.testCase.manualRun.recordedAt) }}
            </span>
          </p>
          <p v-if="props.testCase.manualRun.note" class="mt-1 text-xs text-muted-foreground">
            “{{ props.testCase.manualRun.note }}”
          </p>
          <Button
            variant="ghost"
            size="sm"
            class="mt-1.5 -ml-2"
            :disabled="props.busy"
            @click="emit('clear-manual', props.testCase)"
          >
            <X />
            Clear
          </Button>
        </template>

        <template v-else>
          <p class="text-xs text-muted-foreground">
            Phone the agent and play the caller above. Record what happened — a real verdict
            outranks the simulated one.
          </p>
          <input
            v-model="note"
            type="text"
            placeholder="What happened? (optional)"
            class="mt-2 w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @keyup.enter="record('passed')"
          />
          <div class="mt-2 flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="props.busy" @click="record('passed')">
              <ThumbsUp />
              It passed
            </Button>
            <Button variant="outline" size="sm" :disabled="props.busy" @click="record('failed')">
              <ThumbsDown />
              It failed
            </Button>
          </div>
        </template>
      </div>
    </CardContent>
  </Card>
</template>
