import {
  addToRoll,
  parseManualRoll,
  roll2d6,
  rollD6,
  type ManualRollError,
  type RandomFn,
  type RollKind,
} from './dice';
import { lookup, type RollTable } from './tables';

export type Modifier = { label: string; value: number };

export type RollResult<T = unknown> = {
  kind: RollKind;
  dice: number;
  modifiers: readonly Modifier[];
  final: number;
  table: string | null;
  outcome: T | null;
  manual: boolean;
};

export type RollOutcome<T> =
  | { ok: true; result: RollResult<T> }
  | { ok: false; error: ManualRollError };

type RollOptions = {
  /** Text typed by the commissioner; when set, nothing is rolled. */
  manual?: string;
  random?: RandomFn;
};

type TwoDiceOptions = RollOptions & { modifiers?: readonly Modifier[] };

export function rollTwoDice(options: TwoDiceOptions = {}): RollOutcome<never> {
  const modifiers = options.modifiers ?? [];
  const dice = readDice('2d6', options);
  if (!dice.ok) return dice;

  const total = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  return {
    ok: true,
    result: {
      kind: '2d6',
      dice: dice.roll,
      modifiers,
      final: addToRoll(dice.roll, total),
      table: null,
      outcome: null,
      manual: options.manual !== undefined,
    },
  };
}

/** A single die takes no modifiers, so its final value is the die itself. */
export function rollOneDie(options: RollOptions = {}): RollOutcome<never> {
  const dice = readDice('1d6', options);
  if (!dice.ok) return dice;

  return {
    ok: true,
    result: {
      kind: '1d6',
      dice: dice.roll,
      modifiers: [],
      final: dice.roll,
      table: null,
      outcome: null,
      manual: options.manual !== undefined,
    },
  };
}

export function rollOnTable<T>(table: RollTable<T>, options: TwoDiceOptions = {}): RollOutcome<T> {
  const rolled = rollTwoDice(options);
  if (!rolled.ok) return rolled;

  return {
    ok: true,
    result: { ...rolled.result, table: table.name, outcome: lookup(table, rolled.result.final) },
  };
}

function readDice(kind: RollKind, options: RollOptions) {
  if (options.manual !== undefined) return parseManualRoll(options.manual, kind);
  const roll = kind === '2d6' ? roll2d6(options.random) : rollD6(options.random);
  return { ok: true as const, roll };
}
