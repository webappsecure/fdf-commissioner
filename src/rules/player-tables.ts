import { defineTable, type RollTable } from './tables';

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'FS' | 'SS' | 'KR' | 'PR' | 'K';
export type GradedPosition = 'KR' | 'PR' | 'K';
export type RatedPosition = Exclude<PlayerPosition, GradedPosition>;

export type PlayerGrade = 'A' | 'B' | 'C' | 'D';
export type RatingPoint = 0 | 1 | 2;
export type PlayerRating = { pass: RatingPoint; run: RatingPoint };
/** The guide's "pass/run" text, for example "0/1". */
export type RatingText = `${RatingPoint}/${RatingPoint}`;

export type QualityName =
  | 'shaky'
  | 'reliable'
  | 'inefficient'
  | 'efficient'
  | 'erratic'
  | 'dynamic'
  | 'hesitant'
  | 'evasive'
  | 'clumsy'
  | 'secure'
  | 'porous'
  | 'solid'
  | 'undisciplined'
  | 'disciplined'
  | 'soft'
  | 'stiff'
  | 'mild'
  | 'punishing'
  | 'meek'
  | 'aggressive'
  | 'passive'
  | 'active';
export type QualityLevel = 'semi' | 'full';
export type PlayerQuality = { name: QualityName; level: QualityLevel };

/** Each pair is one line from the first quality at full, through none, to the second quality at full. */
export const QUALITY_PAIRS: readonly (readonly [QualityName, QualityName])[] = [
  ['shaky', 'reliable'],
  ['inefficient', 'efficient'],
  ['erratic', 'dynamic'],
  ['hesitant', 'evasive'],
  ['clumsy', 'secure'],
  ['porous', 'solid'],
  ['undisciplined', 'disciplined'],
  ['soft', 'stiff'],
  ['mild', 'punishing'],
  ['meek', 'aggressive'],
  ['passive', 'active'],
];

/** A chart entry as the guide prints it: a trailing bullet marks a semi quality, no bullet is the full quality. */
type QualityToken = QualityName | `${QualityName}•`;
type Row<T> = readonly [range: string, result: T];

function parseQuality(token: QualityToken): PlayerQuality {
  return token.endsWith('•')
    ? { name: token.slice(0, -1) as QualityName, level: 'semi' }
    : { name: token as QualityName, level: 'full' };
}

function parseRating(text: RatingText): PlayerRating {
  return { pass: Number(text[0]) as RatingPoint, run: Number(text[2]) as RatingPoint };
}

function table<T>(name: string, rows: readonly Row<T>[]) {
  return defineTable<T>(name, rows.map(([range, result]) => ({ range, result })));
}

function ageTable(position: PlayerPosition, rows: readonly Row<number>[]) {
  return table(`${position} Age`, rows);
}

function ratingTable(position: RatedPosition, rows: readonly Row<RatingText>[]) {
  return table(`${position} Rating`, rows.map(([range, text]) => [range, parseRating(text)] as const));
}

function gradeTable(position: GradedPosition, rows: readonly Row<PlayerGrade>[]) {
  return table(`${position} Grade`, rows);
}

function countTable(position: RatedPosition, rows: readonly Row<0 | 1 | 2>[]) {
  return table(`${position} Quality Count`, rows);
}

/** One column of a quality chart: the ratings that use it, and its rows. */
export type QualityColumn = { ratings: readonly RatingText[]; table: RollTable<PlayerQuality> };

function chart(position: RatedPosition, columns: readonly { ratings: readonly RatingText[]; rows: readonly Row<QualityToken>[] }[]) {
  return columns.map(({ ratings, rows }): QualityColumn => ({
    ratings,
    table: table(
      `${position} Quality Chart ${ratings.join(' or ')}`,
      rows.map(([range, token]) => [range, parseQuality(token)] as const),
    ),
  }));
}

export type RatedTables = {
  kind: 'rated';
  age: RollTable<number>;
  rating: RollTable<PlayerRating>;
  count: RollTable<0 | 1 | 2>;
  chart: readonly QualityColumn[];
};
export type GradedTables = { kind: 'graded'; age: RollTable<number>; grade: RollTable<PlayerGrade> };

// Age columns. The guide prints the same shape for several positions; each position still gets its own table.
const AGE_QB: Row<number>[] = [
  ['11-12', 22], ['13-14', 23], ['15-21', 24], ['22-24', 25], ['25-31', 26], ['32-34', 27], ['35-41', 28],
  ['42-44', 29], ['45-51', 30], ['52-54', 31], ['55-61', 32], ['62-63', 33], ['64-65', 34], ['66', 35],
];
const AGE_TE_OL: Row<number>[] = [
  ['11-14', 22], ['15-22', 23], ['23-31', 24], ['32-34', 25], ['35-41', 26], ['42-44', 27], ['45-51', 28],
  ['52-53', 29], ['54-55', 30], ['56-61', 31], ['62-63', 32], ['64', 33], ['65', 34], ['66', 35],
];
const AGE_SKILL: Row<number>[] = [
  ['11-15', 22], ['16-24', 23], ['25-33', 24], ['34-36', 25], ['41-43', 26], ['44-51', 27],
  ['52-55', 28], ['56-62', 29], ['63-64', 30], ['65', 31], ['66', 32],
];
const AGE_K: Row<number>[] = [
  ['11-14', 22], ['15-22', 23], ['23-31', 24], ['32-34', 25], ['35-41', 26], ['42-44', 27],
  ['45-51', 28], ['52-55', 29], ['56-62', 30], ['63-64', 31], ['65', 32], ['66', 33],
];

const COUNT_ONE_AT_63: Row<0 | 1 | 2>[] = [['11-62', 0], ['63-64', 1], ['65-66', 2]];

const RATED: Record<RatedPosition, RatedTables> = {
  // 4.1.2
  QB: {
    kind: 'rated',
    age: ageTable('QB', AGE_QB),
    rating: ratingTable('QB', [['11-13', '0/1'], ['14-23', '1/0'], ['24-53', '1/1'], ['54-56', '1/2'], ['61-66', '2/1']]),
    count: countTable('QB', [['11-43', 0], ['44-61', 1], ['62-66', 2]]),
    chart: chart('QB', [
      {
        ratings: ['1/2', '2/1'],
        rows: [
          ['11', 'inefficient•'], ['12', 'erratic•'], ['13-16', 'hesitant•'], ['21-26', 'evasive•'], ['31-36', 'dynamic•'],
          ['41-46', 'efficient•'], ['51-63', 'reliable•'], ['64-66', 'reliable'],
        ],
      },
      {
        ratings: ['1/1'],
        rows: [
          ['11', 'shaky'], ['12-15', 'shaky•'], ['16-23', 'inefficient•'], ['24-31', 'erratic•'], ['32-41', 'hesitant•'],
          ['42-45', 'evasive•'], ['46-53', 'dynamic•'], ['54-61', 'efficient•'], ['62-65', 'reliable•'], ['66', 'reliable'],
        ],
      },
      {
        ratings: ['0/1', '1/0'],
        rows: [
          ['11-13', 'shaky'], ['14-21', 'shaky•'], ['22-31', 'inefficient•'], ['32-41', 'erratic•'], ['42-46', 'hesitant•'],
          ['51-64', 'evasive•'], ['65', 'dynamic•'], ['66', 'efficient•'],
        ],
      },
    ]),
  },
  // 4.1.3
  RB: {
    kind: 'rated',
    age: ageTable('RB', AGE_SKILL),
    rating: ratingTable('RB', [['11-26', '0/1'], ['31-53', '1/1'], ['54-66', '1/2']]),
    count: countTable('RB', [['11-46', 0], ['51-62', 1], ['63-66', 2]]),
    chart: chart('RB', [
      { ratings: ['1/2'], rows: [['11-26', 'clumsy•'], ['31-46', 'secure•'], ['51-66', 'dynamic•']] },
      { ratings: ['1/1'], rows: [['11-13', 'erratic•'], ['14-36', 'clumsy•'], ['41-56', 'secure•'], ['61-66', 'dynamic•']] },
      { ratings: ['0/1'], rows: [['11-31', 'erratic•'], ['32-46', 'clumsy•'], ['51-66', 'secure•']] },
    ]),
  },
  // 4.1.4
  WR: {
    kind: 'rated',
    age: ageTable('WR', AGE_SKILL),
    rating: ratingTable('WR', [['11-31', '1/0'], ['32-56', '1/1'], ['61-66', '2/1']]),
    count: countTable('WR', [['11-62', 0], ['63-64', 1], ['65-66', 2]]),
    chart: chart('WR', [
      { ratings: ['2/1'], rows: [['11-13', 'erratic•'], ['14-26', 'shaky•'], ['31-43', 'reliable•'], ['44-66', 'dynamic•']] },
      { ratings: ['1/1'], rows: [['11-12', 'erratic•'], ['13-32', 'shaky•'], ['33-55', 'reliable•'], ['56-66', 'dynamic•']] },
      { ratings: ['1/0'], rows: [['11-26', 'erratic•'], ['31-46', 'shaky•'], ['51-63', 'reliable•'], ['64-66', 'dynamic•']] },
    ]),
  },
  // 4.1.5
  TE: {
    kind: 'rated',
    age: ageTable('TE', AGE_TE_OL),
    rating: ratingTable('TE', [['11-13', '0/1'], ['14-16', '0/2'], ['21-63', '1/1'], ['64-66', '2/1']]),
    count: countTable('TE', [['11-63', 0], ['64-65', 1], ['66', 2]]),
    chart: chart('TE', [
      { ratings: ['2/1'], rows: [['11-24', 'clumsy•'], ['25-46', 'secure•'], ['51-66', 'dynamic•']] },
      { ratings: ['1/1', '0/2'], rows: [['11-16', 'erratic•'], ['21-34', 'clumsy•'], ['35-56', 'secure•'], ['61-66', 'dynamic•']] },
      { ratings: ['0/1'], rows: [['11-31', 'erratic•'], ['32-46', 'clumsy•'], ['51-66', 'secure•']] },
    ]),
  },
  // 4.1.6
  OL: {
    kind: 'rated',
    age: ageTable('OL', AGE_TE_OL),
    rating: ratingTable('OL', [['11-14', '0/1'], ['15-22', '1/0'], ['23-24', '0/2'], ['25-56', '1/1'], ['61-63', '1/2'], ['64-66', '2/1']]),
    count: countTable('OL', COUNT_ONE_AT_63),
    chart: chart('OL', [
      { ratings: ['1/2', '2/1'], rows: [['11', 'porous•'], ['12-26', 'undisciplined•'], ['31-45', 'disciplined•'], ['46-66', 'solid•']] },
      { ratings: ['0/2', '1/1'], rows: [['11-21', 'porous•'], ['22-36', 'undisciplined•'], ['41-55', 'disciplined•'], ['56-66', 'solid•']] },
      { ratings: ['0/1', '1/0'], rows: [['11-31', 'porous•'], ['32-46', 'undisciplined•'], ['51-65', 'disciplined•'], ['66', 'solid•']] },
    ]),
  },
  // 4.1.7. The guide has one DL set; DT and DE both use it.
  DL: {
    kind: 'rated',
    age: ageTable('DL', AGE_SKILL),
    rating: ratingTable('DL', [['11-21', '0/1'], ['22-24', '1/0'], ['25-46', '1/1'], ['51-63', '1/2'], ['64-66', '2/1']]),
    count: countTable('DL', COUNT_ONE_AT_63),
    chart: chart('DL', [
      {
        ratings: ['1/2', '2/1'],
        rows: [['11-14', 'mild•'], ['15-26', 'undisciplined•'], ['31-42', 'disciplined•'], ['43-54', 'punishing•'], ['55-66', 'stiff•']],
      },
      {
        ratings: ['1/1'],
        rows: [['11-21', 'soft•'], ['22-24', 'mild•'], ['25-36', 'undisciplined•'], ['41-52', 'disciplined•'], ['53-56', 'punishing•'], ['61-66', 'stiff•']],
      },
      {
        ratings: ['0/1', '1/0'],
        rows: [['11-22', 'soft•'], ['23-34', 'mild•'], ['35-46', 'undisciplined•'], ['51-62', 'disciplined•'], ['63-66', 'punishing•']],
      },
    ]),
  },
  // 4.1.8
  LB: {
    kind: 'rated',
    age: ageTable('LB', AGE_SKILL),
    rating: ratingTable('LB', [['11-13', '0/1'], ['14-16', '1/0'], ['21-46', '1/1'], ['51-61', '1/2'], ['62-66', '2/1']]),
    count: countTable('LB', [['11-55', 0], ['56-64', 1], ['65-66', 2]]),
    chart: chart('LB', [
      {
        ratings: ['1/2', '2/1'],
        rows: [['11', 'soft•'], ['12-25', 'mild•'], ['26-33', 'undisciplined•'], ['34-41', 'disciplined•'], ['42-55', 'punishing•'], ['56-66', 'stiff•']],
      },
      {
        ratings: ['1/1'],
        rows: [['11-22', 'soft•'], ['23-26', 'mild•'], ['31-35', 'undisciplined•'], ['36-44', 'disciplined•'], ['45-54', 'punishing•'], ['55-66', 'stiff•']],
      },
      {
        ratings: ['0/1', '1/0'],
        rows: [['11-31', 'soft•'], ['32-46', 'mild•'], ['51-54', 'undisciplined•'], ['55-62', 'disciplined•'], ['63-64', 'punishing•'], ['65-66', 'stiff•']],
      },
    ]),
  },
  // 4.1.9
  CB: {
    kind: 'rated',
    age: ageTable('CB', AGE_SKILL),
    rating: ratingTable('CB', [['11-26', '1/0'], ['31-55', '1/1'], ['56-66', '2/1']]),
    count: countTable('CB', [['11-63', 0], ['64-65', 1], ['66', 2]]),
    chart: chart('CB', [
      { ratings: ['2/1'], rows: [['11-26', 'meek•'], ['31-66', 'aggressive•']] },
      { ratings: ['1/1'], rows: [['11-36', 'meek•'], ['41-66', 'aggressive•']] },
      { ratings: ['1/0'], rows: [['11-46', 'meek•'], ['51-66', 'aggressive•']] },
    ]),
  },
  // 4.1.10
  FS: {
    kind: 'rated',
    age: ageTable('FS', AGE_SKILL),
    rating: ratingTable('FS', [['11-13', '0/1'], ['14-24', '1/0'], ['25-64', '1/1'], ['65-66', '2/1']]),
    count: countTable('FS', [['11-56', 0], ['61-64', 1], ['65-66', 2]]),
    chart: chart('FS', [
      { ratings: ['2/1'], rows: [['11-12', 'passive•'], ['13-26', 'meek•'], ['31-43', 'aggressive•'], ['44-66', 'active•']] },
      { ratings: ['1/1'], rows: [['11-23', 'passive•'], ['24-36', 'meek•'], ['41-52', 'aggressive•'], ['53-66', 'active•']] },
      { ratings: ['1/0', '0/1'], rows: [['11-31', 'passive•'], ['32-46', 'meek•'], ['51-63', 'aggressive•'], ['64-66', 'active•']] },
    ]),
  },
  // 4.1.11
  SS: {
    kind: 'rated',
    age: ageTable('SS', AGE_SKILL),
    rating: ratingTable('SS', [['11-23', '0/1'], ['24-26', '1/0'], ['31-53', '1/1'], ['54-55', '2/1'], ['56-66', '1/2']]),
    count: countTable('SS', [['11-56', 0], ['61-64', 1], ['65-66', 2]]),
    chart: chart('SS', [
      { ratings: ['2/1', '1/2'], rows: [['11-12', 'passive•'], ['13-24', 'meek•'], ['25-41', 'aggressive•'], ['42-66', 'active•']] },
      { ratings: ['1/1'], rows: [['11-23', 'passive•'], ['24-34', 'meek•'], ['35-46', 'aggressive•'], ['51-66', 'active•']] },
      { ratings: ['1/0', '0/1'], rows: [['11-31', 'passive•'], ['32-44', 'meek•'], ['45-61', 'aggressive•'], ['62-66', 'active•']] },
    ]),
  },
};

const KR_PR_GRADE = gradeTable('KR', [['11-36', 'D'], ['41-54', 'C'], ['55-63', 'B'], ['64-66', 'A']]);

const GRADED: Record<GradedPosition, GradedTables> = {
  // 4.1.12. Kick and punt returners share one set.
  KR: { kind: 'graded', age: ageTable('KR', AGE_SKILL), grade: KR_PR_GRADE },
  PR: { kind: 'graded', age: ageTable('PR', AGE_SKILL), grade: KR_PR_GRADE },
  // 4.1.13
  K: {
    kind: 'graded',
    age: ageTable('K', AGE_K),
    grade: gradeTable('K', [['11-16', 'D'], ['21-44', 'C'], ['45-63', 'B'], ['64-66', 'A']]),
  },
};

export const PLAYER_POSITIONS: readonly PlayerPosition[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'FS', 'SS', 'KR', 'PR', 'K'];

export function isGradedPosition(position: PlayerPosition): position is GradedPosition {
  return position === 'KR' || position === 'PR' || position === 'K';
}

export function playerTablesFor(position: GradedPosition): GradedTables;
export function playerTablesFor(position: RatedPosition): RatedTables;
export function playerTablesFor(position: PlayerPosition): RatedTables | GradedTables;
export function playerTablesFor(position: PlayerPosition): RatedTables | GradedTables {
  return isGradedPosition(position) ? GRADED[position] : RATED[position];
}

export function ratingText(rating: PlayerRating): RatingText {
  return `${rating.pass}/${rating.run}`;
}

/** The chart column for a rated player, or null if the guide's chart has no column for this rating. */
export function qualityTableFor(position: RatedPosition, rating: PlayerRating) {
  const text = ratingText(rating);
  return RATED[position].chart.find((column) => column.ratings.includes(text))?.table ?? null;
}
