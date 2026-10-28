import {
  isGradedPosition,
  playerTablesFor,
  PLAYER_POSITIONS,
  QUALITY_PAIRS,
  qualityTableFor,
  ratingText,
  type PlayerPosition,
  type RatedPosition,
  type RatingText,
} from './player-tables';
import { lookup } from './tables';

const RATED = PLAYER_POSITIONS.filter((position): position is RatedPosition => !isGradedPosition(position));

function ageAt(position: PlayerPosition, roll: number) {
  return lookup(playerTablesFor(position).age, roll);
}

function ratingAt(position: RatedPosition, roll: number) {
  return ratingText(lookup(playerTablesFor(position).rating, roll));
}

function qualityAt(position: RatedPosition, rating: RatingText, roll: number) {
  const [pass, run] = rating.split('/').map(Number) as [0 | 1 | 2, 0 | 1 | 2];
  const quality = lookup(qualityTableFor(position, { pass, run })!, roll);
  return `${quality.name}${quality.level === 'semi' ? '•' : ''}`;
}

describe('age tables (guide 4.1.2 to 4.1.13)', () => {
  it('QB', () => {
    expect([11, 12, 13, 21, 22, 66, 64, 65].map((roll) => ageAt('QB', roll))).toEqual([22, 22, 23, 24, 25, 35, 34, 34]);
    expect([35, 41, 42, 45, 52, 55, 62].map((roll) => ageAt('QB', roll))).toEqual([28, 28, 29, 30, 31, 32, 33]);
  });

  it.each(['TE', 'OL'] as const)('%s', (position) => {
    expect([11, 14, 15, 22, 23, 31, 32, 34, 35, 41, 42, 44, 45, 51].map((roll) => ageAt(position, roll))).toEqual([
      22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28,
    ]);
    expect([52, 53, 54, 55, 56, 61, 62, 63, 64, 65, 66].map((roll) => ageAt(position, roll))).toEqual([
      29, 29, 30, 30, 31, 31, 32, 32, 33, 34, 35,
    ]);
  });

  it.each(['RB', 'WR', 'DL', 'LB', 'CB', 'FS', 'SS', 'KR', 'PR'] as const)('%s', (position) => {
    expect([11, 15, 16, 24, 25, 33, 34, 36, 41, 43, 44, 51].map((roll) => ageAt(position, roll))).toEqual([
      22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
    ]);
    expect([52, 55, 56, 62, 63, 64, 65, 66].map((roll) => ageAt(position, roll))).toEqual([28, 28, 29, 29, 30, 30, 31, 32]);
  });

  it('K', () => {
    expect([11, 14, 15, 22, 23, 31, 32, 34, 35, 41, 42, 44].map((roll) => ageAt('K', roll))).toEqual([
      22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
    ]);
    expect([45, 51, 52, 55, 56, 62, 63, 64, 65, 66].map((roll) => ageAt('K', roll))).toEqual([28, 28, 29, 29, 30, 30, 31, 31, 32, 33]);
  });
});

describe('rating tables', () => {
  const cases: [RatedPosition, [number, RatingText][]][] = [
    ['QB', [[11, '0/1'], [13, '0/1'], [14, '1/0'], [23, '1/0'], [24, '1/1'], [53, '1/1'], [54, '1/2'], [56, '1/2'], [61, '2/1'], [66, '2/1']]],
    ['RB', [[11, '0/1'], [26, '0/1'], [31, '1/1'], [53, '1/1'], [54, '1/2'], [66, '1/2']]],
    ['WR', [[11, '1/0'], [31, '1/0'], [32, '1/1'], [56, '1/1'], [61, '2/1'], [66, '2/1']]],
    ['TE', [[11, '0/1'], [13, '0/1'], [14, '0/2'], [16, '0/2'], [21, '1/1'], [63, '1/1'], [64, '2/1'], [66, '2/1']]],
    ['OL', [[11, '0/1'], [14, '0/1'], [15, '1/0'], [22, '1/0'], [23, '0/2'], [24, '0/2'], [25, '1/1'], [56, '1/1'], [61, '1/2'], [63, '1/2'], [64, '2/1'], [66, '2/1']]],
    ['DL', [[11, '0/1'], [21, '0/1'], [22, '1/0'], [24, '1/0'], [25, '1/1'], [46, '1/1'], [51, '1/2'], [63, '1/2'], [64, '2/1'], [66, '2/1']]],
    ['LB', [[11, '0/1'], [13, '0/1'], [14, '1/0'], [16, '1/0'], [21, '1/1'], [46, '1/1'], [51, '1/2'], [61, '1/2'], [62, '2/1'], [66, '2/1']]],
    ['CB', [[11, '1/0'], [26, '1/0'], [31, '1/1'], [55, '1/1'], [56, '2/1'], [66, '2/1']]],
    ['FS', [[11, '0/1'], [13, '0/1'], [14, '1/0'], [24, '1/0'], [25, '1/1'], [64, '1/1'], [65, '2/1'], [66, '2/1']]],
    ['SS', [[11, '0/1'], [23, '0/1'], [24, '1/0'], [26, '1/0'], [31, '1/1'], [53, '1/1'], [54, '2/1'], [55, '2/1'], [56, '1/2'], [66, '1/2']]],
  ];

  it.each(cases)('%s', (position, expected) => {
    expect(expected.map(([roll]) => ratingAt(position, roll))).toEqual(expected.map(([, text]) => text));
  });
});

describe('quality count tables', () => {
  // [position, last roll with 0 qualities, first roll with 1 quality, first roll with 2 qualities]
  const cases: [RatedPosition, number, number, number][] = [
    ['QB', 43, 44, 62],
    ['RB', 46, 51, 63],
    ['WR', 62, 63, 65],
    ['TE', 63, 64, 66],
    ['OL', 62, 63, 65],
    ['DL', 62, 63, 65],
    ['LB', 55, 56, 65],
    ['CB', 63, 64, 66],
    ['FS', 56, 61, 65],
    ['SS', 56, 61, 65],
  ];

  it.each(cases)('%s', (position, lastZero, one, two) => {
    const { count } = playerTablesFor(position);
    expect(lookup(count, 11)).toBe(0);
    expect(lookup(count, lastZero)).toBe(0);
    expect(lookup(count, one)).toBe(1);
    expect(lookup(count, two)).toBe(2);
    expect(lookup(count, 66)).toBe(2);
  });
});

describe('grades', () => {
  it('KR and PR', () => {
    for (const position of ['KR', 'PR'] as const) {
      const { grade } = playerTablesFor(position);
      expect([11, 36, 41, 54, 55, 63, 64, 66].map((roll) => lookup(grade, roll))).toEqual(['D', 'D', 'C', 'C', 'B', 'B', 'A', 'A']);
    }
  });

  it('K', () => {
    const { grade } = playerTablesFor('K');
    expect([11, 16, 21, 44, 45, 63, 64, 66].map((roll) => lookup(grade, roll))).toEqual(['D', 'D', 'C', 'C', 'B', 'B', 'A', 'A']);
  });

  it('graded positions have no rating, count or chart', () => {
    for (const position of ['KR', 'PR', 'K'] as const) {
      expect(playerTablesFor(position)).not.toHaveProperty('rating');
      expect(playerTablesFor(position)).not.toHaveProperty('count');
      expect(playerTablesFor(position)).not.toHaveProperty('chart');
    }
  });
});

describe('quality charts', () => {
  it('QB columns', () => {
    expect([11, 16, 21, 26, 31, 36, 41, 46, 51, 63, 64, 66].map((roll) => qualityAt('QB', '1/2', roll))).toEqual([
      'inefficient•', 'hesitant•', 'evasive•', 'evasive•', 'dynamic•', 'dynamic•', 'efficient•', 'efficient•', 'reliable•', 'reliable•', 'reliable', 'reliable',
    ]);
    expect([11, 12, 15, 16, 23, 24, 31, 32, 41, 42, 45, 46, 53, 54, 61, 62, 65, 66].map((roll) => qualityAt('QB', '1/1', roll))).toEqual([
      'shaky', 'shaky•', 'shaky•', 'inefficient•', 'inefficient•', 'erratic•', 'erratic•', 'hesitant•', 'hesitant•', 'evasive•', 'evasive•',
      'dynamic•', 'dynamic•', 'efficient•', 'efficient•', 'reliable•', 'reliable•', 'reliable',
    ]);
    expect([11, 13, 14, 21, 22, 31, 32, 41, 42, 46, 51, 64, 65, 66].map((roll) => qualityAt('QB', '0/1', roll))).toEqual([
      'shaky', 'shaky', 'shaky•', 'shaky•', 'inefficient•', 'inefficient•', 'erratic•', 'erratic•', 'hesitant•', 'hesitant•', 'evasive•', 'evasive•',
      'dynamic•', 'efficient•',
    ]);
    expect(qualityAt('QB', '1/0', 65)).toBe('dynamic•');
    expect(qualityAt('QB', '2/1', 12)).toBe('erratic•');
  });

  it('RB, WR and TE columns', () => {
    expect([11, 26, 31, 46, 51, 66].map((roll) => qualityAt('RB', '1/2', roll))).toEqual(['clumsy•', 'clumsy•', 'secure•', 'secure•', 'dynamic•', 'dynamic•']);
    expect([11, 13, 14, 36, 41, 56, 61, 66].map((roll) => qualityAt('RB', '1/1', roll))).toEqual([
      'erratic•', 'erratic•', 'clumsy•', 'clumsy•', 'secure•', 'secure•', 'dynamic•', 'dynamic•',
    ]);
    expect([11, 31, 32, 46, 51, 66].map((roll) => qualityAt('RB', '0/1', roll))).toEqual(['erratic•', 'erratic•', 'clumsy•', 'clumsy•', 'secure•', 'secure•']);
    expect([11, 13, 14, 26, 31, 43, 44, 66].map((roll) => qualityAt('WR', '2/1', roll))).toEqual([
      'erratic•', 'erratic•', 'shaky•', 'shaky•', 'reliable•', 'reliable•', 'dynamic•', 'dynamic•',
    ]);
    expect([11, 12, 13, 32, 33, 55, 56, 66].map((roll) => qualityAt('WR', '1/1', roll))).toEqual([
      'erratic•', 'erratic•', 'shaky•', 'shaky•', 'reliable•', 'reliable•', 'dynamic•', 'dynamic•',
    ]);
    expect([11, 26, 31, 46, 51, 63, 64, 66].map((roll) => qualityAt('WR', '1/0', roll))).toEqual([
      'erratic•', 'erratic•', 'shaky•', 'shaky•', 'reliable•', 'reliable•', 'dynamic•', 'dynamic•',
    ]);
    expect([11, 24, 25, 46, 51, 66].map((roll) => qualityAt('TE', '2/1', roll))).toEqual(['clumsy•', 'clumsy•', 'secure•', 'secure•', 'dynamic•', 'dynamic•']);
    expect([11, 16, 21, 34, 35, 56, 61, 66].map((roll) => qualityAt('TE', '0/2', roll))).toEqual([
      'erratic•', 'erratic•', 'clumsy•', 'clumsy•', 'secure•', 'secure•', 'dynamic•', 'dynamic•',
    ]);
    expect(qualityAt('TE', '1/1', 35)).toBe('secure•');
    expect([11, 31, 32, 46, 51, 66].map((roll) => qualityAt('TE', '0/1', roll))).toEqual(['erratic•', 'erratic•', 'clumsy•', 'clumsy•', 'secure•', 'secure•']);
  });

  it('OL and DL columns', () => {
    expect([11, 12, 26, 31, 45, 46, 66].map((roll) => qualityAt('OL', '2/1', roll))).toEqual([
      'porous•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'solid•', 'solid•',
    ]);
    expect([11, 21, 22, 36, 41, 55, 56, 66].map((roll) => qualityAt('OL', '0/2', roll))).toEqual([
      'porous•', 'porous•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'solid•', 'solid•',
    ]);
    expect([11, 31, 32, 46, 51, 65, 66].map((roll) => qualityAt('OL', '1/0', roll))).toEqual([
      'porous•', 'porous•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'solid•',
    ]);
    expect([11, 14, 15, 26, 31, 42, 43, 54, 55, 66].map((roll) => qualityAt('DL', '2/1', roll))).toEqual([
      'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•', 'stiff•', 'stiff•',
    ]);
    expect([11, 21, 22, 24, 25, 36, 41, 52, 53, 56, 61, 66].map((roll) => qualityAt('DL', '1/1', roll))).toEqual([
      'soft•', 'soft•', 'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•', 'stiff•', 'stiff•',
    ]);
    expect([11, 22, 23, 34, 35, 46, 51, 62, 63, 66].map((roll) => qualityAt('DL', '0/1', roll))).toEqual([
      'soft•', 'soft•', 'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•',
    ]);
  });

  it('LB, CB, FS and SS columns', () => {
    expect([11, 12, 25, 26, 33, 34, 41, 42, 55, 56, 66].map((roll) => qualityAt('LB', '2/1', roll))).toEqual([
      'soft•', 'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•', 'stiff•', 'stiff•',
    ]);
    expect([11, 22, 23, 26, 31, 35, 36, 44, 45, 54, 55, 66].map((roll) => qualityAt('LB', '1/1', roll))).toEqual([
      'soft•', 'soft•', 'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•', 'stiff•', 'stiff•',
    ]);
    expect([11, 31, 32, 46, 51, 54, 55, 62, 63, 64, 65, 66].map((roll) => qualityAt('LB', '1/0', roll))).toEqual([
      'soft•', 'soft•', 'mild•', 'mild•', 'undisciplined•', 'undisciplined•', 'disciplined•', 'disciplined•', 'punishing•', 'punishing•', 'stiff•', 'stiff•',
    ]);
    expect([11, 26, 31, 66].map((roll) => qualityAt('CB', '2/1', roll))).toEqual(['meek•', 'meek•', 'aggressive•', 'aggressive•']);
    expect([11, 36, 41, 66].map((roll) => qualityAt('CB', '1/1', roll))).toEqual(['meek•', 'meek•', 'aggressive•', 'aggressive•']);
    expect([11, 46, 51, 66].map((roll) => qualityAt('CB', '1/0', roll))).toEqual(['meek•', 'meek•', 'aggressive•', 'aggressive•']);
    expect([11, 12, 13, 26, 31, 43, 44, 66].map((roll) => qualityAt('FS', '2/1', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
    expect([11, 23, 24, 36, 41, 52, 53, 66].map((roll) => qualityAt('FS', '1/1', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
    expect([11, 31, 32, 46, 51, 63, 64, 66].map((roll) => qualityAt('FS', '0/1', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
    expect([11, 12, 13, 24, 25, 41, 42, 66].map((roll) => qualityAt('SS', '1/2', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
    expect([11, 23, 24, 34, 35, 46, 51, 66].map((roll) => qualityAt('SS', '1/1', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
    expect([11, 31, 32, 44, 45, 61, 62, 66].map((roll) => qualityAt('SS', '1/0', roll))).toEqual([
      'passive•', 'passive•', 'meek•', 'meek•', 'aggressive•', 'aggressive•', 'active•', 'active•',
    ]);
  });

  it.each(RATED)('%s: every rating it can roll has exactly one chart column', (position) => {
    const tables = playerTablesFor(position);
    for (const row of tables.rating.rows) {
      const text = ratingText(row.result);
      expect(tables.chart.filter((column) => column.ratings.includes(text))).toHaveLength(1);
    }
    const columnRatings = tables.chart.flatMap((column) => column.ratings);
    expect(new Set(columnRatings).size).toBe(columnRatings.length);
  });

  it.each(RATED)('%s: chart qualities are known and each uses one opposite pair line', (position) => {
    const names = new Set(QUALITY_PAIRS.flat());
    for (const column of playerTablesFor(position).chart) {
      for (const row of column.table.rows) expect(names.has(row.result.name)).toBe(true);
    }
  });
});
