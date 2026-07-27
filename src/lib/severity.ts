import type { Severity } from '@/types/api';

/**
 * Static Tailwind class maps per severity.
 *
 * These have to be literal strings. Tailwind resolves utilities by scanning
 * source text, so a template literal like `bg-severity-${severity}` produces
 * no CSS whatsoever — the class lands in the DOM and matches nothing. That is
 * exactly how the issue frequency bar ended up sized correctly but painted
 * with no colour at all.
 *
 * Anything that needs a severity-derived class must select from one of these
 * maps rather than building the name.
 */

export const SEVERITY_BAR: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
};

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'border-severity-critical',
  high: 'border-severity-high',
  medium: 'border-severity-medium',
  low: 'border-severity-low',
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-severity-critical',
  high: 'text-severity-high',
  medium: 'text-severity-medium',
  low: 'text-severity-low',
};

/** Worst-first, for sorting and for legend order. */
export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];
