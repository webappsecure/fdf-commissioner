import { describePlayer, unitOf } from './roster-text';

describe('describePlayer', () => {
  it('shows age, rating and qualities', () => {
    expect(
      describePlayer({
        age: 27,
        rating: { pass: 1, run: 1 },
        grade: null,
        qualities: [
          { name: 'reliable', level: 'full' },
          { name: 'dynamic', level: 'semi' },
        ],
      }),
    ).toBe('27  1/1  Reliable, semi Dynamic');
  });

  it('shows a grade and no qualities text', () => {
    expect(describePlayer({ age: 31, rating: null, grade: 'B', qualities: [] })).toBe('31  Grade B');
  });

  it('shows a rating with no qualities', () => {
    expect(describePlayer({ age: 22, rating: { pass: 0, run: 2 }, grade: null, qualities: [] })).toBe('22  0/2');
  });
});

describe('unitOf', () => {
  it('groups positions', () => {
    expect(['QB', 'RB', 'WR', 'TE', 'OL'].map((p) => unitOf(p as never))).toEqual(Array(5).fill('Offense'));
    expect(['DT', 'DE', 'LB', 'CB', 'FS', 'SS'].map((p) => unitOf(p as never))).toEqual(Array(6).fill('Defense'));
    expect(['PR', 'KR', 'K'].map((p) => unitOf(p as never))).toEqual(Array(3).fill('Special teams'));
  });
});
