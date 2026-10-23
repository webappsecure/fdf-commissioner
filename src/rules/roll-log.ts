import type { Modifier, RollResult } from './roll';

export type RollLogEntry = {
  createdAt: string;
  kind: RollResult['kind'];
  tableName: string | null;
  dice: number;
  modifiers: readonly Modifier[];
  finalRoll: number;
  outcome: unknown;
  manual: boolean;
  /** Describes the record the roll changed; later features fill this in. */
  context: unknown;
};

export interface RollLogStore {
  append(entry: RollLogEntry): Promise<number>;
}

export function recordRoll(
  store: RollLogStore,
  result: RollResult,
  context: unknown = null,
  now: () => Date = () => new Date(),
) {
  return store.append({
    createdAt: now().toISOString(),
    kind: result.kind,
    tableName: result.table,
    dice: result.dice,
    modifiers: result.modifiers,
    finalRoll: result.final,
    outcome: result.outcome,
    manual: result.manual,
    context,
  });
}
