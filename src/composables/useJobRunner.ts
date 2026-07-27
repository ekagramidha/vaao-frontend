import { computed, onScopeDispose, ref } from 'vue';
import { ApiClientError, type ApiResult } from '@/services/api';
import { api } from '@/services/api';
import type { Job } from '@/types/api';

/**
 * Drives a long-running backend job from 202 through to completion.
 *
 * Analysis and test runs take minutes and dozens of model calls, so the API
 * hands back a job id and we poll. Polling rather than streaming was chosen
 * deliberately: progress lives in Mongo, so a refresh mid-run reattaches to the
 * same job instead of losing it, which matters when the widget is an iframe a
 * user may navigate away from.
 */

const POLL_INTERVAL_MS = 2000;
/** Roughly ten minutes. A run that exceeds this has gone wrong. */
const MAX_POLLS = 300;

export interface JobRunnerOptions {
  /** Called once the job reports `succeeded`, to refresh whatever it produced. */
  onSuccess?: (job: Job) => Promise<void> | void;
  onFailure?: (message: string) => void;
}

export function useJobRunner(options: JobRunnerOptions = {}) {
  const job = ref<Job | null>(null);
  const error = ref<string | null>(null);
  const isStarting = ref(false);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const isRunning = computed(
    () => isStarting.value || job.value?.status === 'queued' || job.value?.status === 'running',
  );

  const progressLabel = computed(() => {
    if (isStarting.value) return 'Starting';
    return job.value?.progress.message ?? '';
  });

  /** Null while the total is unknown, which renders as an indeterminate bar. */
  const progressPercent = computed(() => {
    const progress = job.value?.progress;
    if (!progress || progress.total <= 0) return null;
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  });

  function stop(): void {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  async function poll(jobId: string, attempt = 0): Promise<void> {
    if (cancelled) return;

    if (attempt >= MAX_POLLS) {
      error.value = 'This job is taking longer than expected. Check the server logs.';
      return;
    }

    try {
      const { data } = await api.getJob(jobId);
      job.value = data;

      if (data.status === 'succeeded') {
        await options.onSuccess?.(data);
        return;
      }

      if (data.status === 'failed' || data.status === 'cancelled') {
        const message = data.error ?? 'The job did not complete.';
        error.value = message;
        options.onFailure?.(message);
        return;
      }

      timer = setTimeout(() => void poll(jobId, attempt + 1), POLL_INTERVAL_MS);
    } catch (caught) {
      // A single failed poll is usually a blip; keep trying rather than
      // abandoning a job that is still running server-side.
      if (caught instanceof ApiClientError && caught.code === 'NETWORK_ERROR') {
        timer = setTimeout(() => void poll(jobId, attempt + 1), POLL_INTERVAL_MS);
        return;
      }
      error.value = caught instanceof Error ? caught.message : 'Could not read job status.';
    }
  }

  /** Starts a job and follows it to completion. */
  async function start(starter: () => Promise<ApiResult<Job>>): Promise<void> {
    stop();
    cancelled = false;
    error.value = null;
    isStarting.value = true;

    try {
      const { data } = await starter();
      job.value = data;
      await poll(data.id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not start the job.';
      error.value = message;
      options.onFailure?.(message);
    } finally {
      isStarting.value = false;
    }
  }

  function reset(): void {
    stop();
    job.value = null;
    error.value = null;
  }

  // Stops the timer when the owning component goes away, so a user who
  // navigates mid-run does not leave a request loop behind.
  onScopeDispose(() => {
    cancelled = true;
    stop();
  });

  return { job, error, isRunning, progressLabel, progressPercent, start, reset };
}
