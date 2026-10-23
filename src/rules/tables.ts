import { isValid2d6, MAX_ROLL, MIN_ROLL, rollToOrdinal, ordinalToRoll } from './dice';

export type TableRow<T> = { range: string; result: T };

export type TableIssue = {
  kind: 'invalid-range' | 'reversed' | 'gap' | 'overlap';
  range: string;
  detail: string;
};

type ParsedRow<T> = { from: number; to: number; range: string; result: T };

export type RollTable<T> = { name: string; rows: readonly ParsedRow<T>[] };

function parseRange(range: string): { from: number; to: number } | null {
  const match = /^(\d{2})(?:-(\d{2}))?$/.exec(range.trim());
  if (!match) return null;
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  return isValid2d6(from) && isValid2d6(to) ? { from, to } : null;
}

function formatSpan(startOrdinal: number, endOrdinal: number) {
  const start = ordinalToRoll(startOrdinal);
  const end = ordinalToRoll(endOrdinal);
  return start === end ? String(start) : `${start}-${end}`;
}

function spans(ordinals: number[]) {
  const result: [number, number][] = [];
  for (const ordinal of ordinals) {
    const last = result[result.length - 1];
    if (last && last[1] === ordinal - 1) last[1] = ordinal;
    else result.push([ordinal, ordinal]);
  }
  return result;
}

/** Rows must cover 11 to 66 exactly once, using only digits 1 to 6. */
export function findTableIssues(rows: readonly { range: string }[]): TableIssue[] {
  const issues: TableIssue[] = [];
  const coverage = new Array<number>(37).fill(0);

  for (const row of rows) {
    const parsed = parseRange(row.range);
    if (!parsed) {
      issues.push({
        kind: 'invalid-range',
        range: row.range,
        detail: `must be NN or NN-MM using rolls from ${MIN_ROLL} to ${MAX_ROLL} with digits 1 to 6`,
      });
      continue;
    }
    const from = rollToOrdinal(parsed.from);
    const to = rollToOrdinal(parsed.to);
    if (from > to) {
      issues.push({ kind: 'reversed', range: row.range, detail: 'starts after it ends' });
      continue;
    }
    for (let ordinal = from; ordinal <= to; ordinal++) coverage[ordinal]++;
  }

  const ordinals = Array.from({ length: 36 }, (_, index) => index + 1);
  for (const [start, end] of spans(ordinals.filter((ordinal) => coverage[ordinal] === 0))) {
    issues.push({ kind: 'gap', range: formatSpan(start, end), detail: 'no row covers this range' });
  }
  for (const [start, end] of spans(ordinals.filter((ordinal) => coverage[ordinal] > 1))) {
    issues.push({ kind: 'overlap', range: formatSpan(start, end), detail: 'covered by more than one row' });
  }
  return issues;
}

export function defineTable<T>(name: string, rows: readonly TableRow<T>[]): RollTable<T> {
  const issues = findTableIssues(rows);
  if (issues.length > 0) {
    const summary = issues.map((issue) => `${issue.kind} ${issue.range} (${issue.detail})`).join('; ');
    throw new Error(`Table "${name}" is invalid: ${summary}`);
  }
  return {
    name,
    rows: rows.map((row) => {
      const { from, to } = parseRange(row.range)!;
      return { from, to, range: row.range, result: row.result };
    }),
  };
}

export function lookup<T>(table: RollTable<T>, roll: number): T {
  if (!isValid2d6(roll)) throw new Error(`Roll ${roll} is not a valid 2d6 roll`);
  const ordinal = rollToOrdinal(roll);
  const row = table.rows.find(
    (candidate) => ordinal >= rollToOrdinal(candidate.from) && ordinal <= rollToOrdinal(candidate.to),
  );
  if (!row) throw new Error(`Table "${table.name}" has no row for ${roll}`);
  return row.result;
}
