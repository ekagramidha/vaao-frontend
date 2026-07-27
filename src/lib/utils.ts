import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, letting a later Tailwind utility win over an earlier one
 * in the same group. This is what allows a component to accept a `class` prop
 * that overrides its own defaults instead of fighting them.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
