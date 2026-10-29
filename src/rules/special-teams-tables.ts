import type { PlayerGrade } from './player-tables';
import { defineTable, type RollTable } from './tables';

export type Electric = 'none' | 'semi' | 'full';

type Row<T> = readonly [range: string, result: T];

const GRADES: readonly PlayerGrade[] = ['A', 'B', 'C', 'D'];

function byGrade<T>(label: string, rows: Record<PlayerGrade, readonly Row<T>[]>) {
  return Object.fromEntries(
    GRADES.map((grade) => [grade, defineTable<T>(`${label} (Grade ${grade})`, rows[grade].map(([range, result]) => ({ range, result })))]),
  ) as Record<PlayerGrade, RollTable<T>>;
}

// Guide section 5.3.1 (page 21): does the returner have the ELECTRIC quality this season.
export const ELECTRIC_TABLES = byGrade<Electric>('Returner ELECTRIC', {
  A: [['11-21', 'none'], ['22-41', 'semi'], ['42-66', 'full']],
  B: [['11-31', 'none'], ['32-52', 'semi'], ['53-66', 'full']],
  C: [['11-43', 'none'], ['44-61', 'semi'], ['62-66', 'full']],
  D: [['11-54', 'none'], ['55-65', 'semi'], ['66', 'full']],
});

// Guide sections 5.3.2 and 5.3.3 (page 22). The result is the top of the success range, which always starts at 11
// (base-6 numbering, so 56 is followed by 61), for the modern era (no 5.3.4 adjustment).
export const FIELD_GOAL_TABLES = byGrade<number>('Kicker FG range', {
  A: [['11-13', 62], ['14-21', 63], ['22-32', 64], ['33-52', 65], ['53-66', 66]],
  B: [['11-12', 55], ['13-15', 56], ['16-25', 61], ['26-42', 62], ['43-55', 63], ['56-66', 64]],
  C: [['11-13', 53], ['14-16', 54], ['21-32', 55], ['33-45', 56], ['46-55', 61], ['56-66', 62]],
  D: [['11', 46], ['12-14', 51], ['15-21', 52], ['22-35', 53], ['36-46', 54], ['51-62', 55], ['63-66', 56]],
});

export const EXTRA_POINT_TABLES = byGrade<number>('Kicker XP range', {
  A: [['11', 63], ['12-14', 64], ['15-23', 65], ['24-66', 66]],
  B: [['11-16', 62], ['21-32', 63], ['33-45', 64], ['46-55', 65], ['56-66', 66]],
  C: [['11-21', 61], ['22-35', 62], ['36-46', 63], ['51-62', 64], ['63-66', 65]],
  D: [['11-25', 56], ['26-41', 61], ['42-54', 62], ['55-63', 63], ['64-66', 64]],
});

/** A success range as the guide prints it, for example `11-62`. */
export function rangeText(top: number) {
  return `11-${top}`;
}
