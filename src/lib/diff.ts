/**
 * Line-level diff for prompt before/after views.
 *
 * A dependency would work, but the requirement here is narrow — two strings of
 * a few hundred lines, rendered once — and an LCS table is a dozen lines. The
 * backend already produces minimal anchored edits, so these diffs are small by
 * construction.
 */

export type DiffOp = 'equal' | 'added' | 'removed';

export interface DiffLine {
  op: DiffOp;
  text: string;
  /** 1-based line number in the "before" text; null for added lines. */
  beforeLine: number | null;
  /** 1-based line number in the "after" text; null for removed lines. */
  afterLine: number | null;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

/** Longest common subsequence lengths for two line arrays. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  return table;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = lcsTable(a, b);

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ op: 'equal', text: a[i], beforeLine: i + 1, afterLine: j + 1 });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      lines.push({ op: 'removed', text: a[i], beforeLine: i + 1, afterLine: null });
      i += 1;
    } else {
      lines.push({ op: 'added', text: b[j], beforeLine: null, afterLine: j + 1 });
      j += 1;
    }
  }

  while (i < a.length) {
    lines.push({ op: 'removed', text: a[i], beforeLine: i + 1, afterLine: null });
    i += 1;
  }
  while (j < b.length) {
    lines.push({ op: 'added', text: b[j], beforeLine: null, afterLine: j + 1 });
    j += 1;
  }

  return lines;
}

export function summariseDiff(lines: DiffLine[]): DiffSummary {
  return lines.reduce<DiffSummary>(
    (summary, line) => {
      if (line.op === 'added') summary.added += 1;
      else if (line.op === 'removed') summary.removed += 1;
      else summary.unchanged += 1;
      return summary;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
}

/**
 * Drops long stretches of unchanged lines, keeping `context` either side of
 * each change. A 200-line prompt with a three-line edit should render as a
 * three-line edit, not as 200 lines the reviewer has to scan.
 */
export function collapseUnchanged(lines: DiffLine[], context = 3): Array<DiffLine | 'gap'> {
  const keep = new Set<number>();

  lines.forEach((line, index) => {
    if (line.op === 'equal') return;
    for (let offset = -context; offset <= context; offset += 1) {
      const target = index + offset;
      if (target >= 0 && target < lines.length) keep.add(target);
    }
  });

  const output: Array<DiffLine | 'gap'> = [];
  let skipping = false;

  lines.forEach((line, index) => {
    if (keep.has(index)) {
      output.push(line);
      skipping = false;
      return;
    }
    if (!skipping) {
      output.push('gap');
      skipping = true;
    }
  });

  return output;
}
