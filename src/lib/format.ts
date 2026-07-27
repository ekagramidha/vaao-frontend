/**
 * Value formatting shared across views.
 *
 * Domain wording lives in `labels.ts` and severity styling in `severity.ts`;
 * this file is only concerned with turning numbers and dates into strings.
 */

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

const RELATIVE_UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60_000, divisor: 1000, unit: 'second' },
  { limit: 3_600_000, divisor: 60_000, unit: 'minute' },
  { limit: 86_400_000, divisor: 3_600_000, unit: 'hour' },
  { limit: 2_592_000_000, divisor: 86_400_000, unit: 'day' },
  { limit: 31_536_000_000, divisor: 2_592_000_000, unit: 'month' },
];

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const elapsed = Date.now() - date.getTime();
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (Math.abs(elapsed) < limit) {
      return formatter.format(-Math.round(elapsed / divisor), unit);
    }
  }
  return formatter.format(-Math.round(elapsed / 31_536_000_000), 'year');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Score bands.
 *
 * Deliberately harsh: 70 is the same threshold the judge uses to pass a test
 * case, so a score shown in amber is genuinely not good enough rather than
 * merely below a decorative target.
 */
export function scoreTone(score: number): 'pass' | 'warn' | 'fail' {
  if (score >= 70) return 'pass';
  if (score >= 40) return 'warn';
  return 'fail';
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
