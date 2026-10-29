import { describePlayer, describeTeamQualities, summarizeSpecialTeams, unitOf } from './roster-text';

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

describe('describeTeamQualities', () => {
  it('lists the scoring quality first in capitals with a bullet for a semi', () => {
    expect(
      describeTeamQualities('prolific-semi', [
        { name: 'solid', level: 'full' },
        { name: 'inefficient', level: 'semi' },
      ]),
    ).toBe('PROLIFIC•, SOLID, INEFFICIENT•');
    expect(describeTeamQualities('inept', [])).toBe('INEPT');
  });

  it('leaves out a neutral rating and says None when empty', () => {
    expect(describeTeamQualities('neutral', [{ name: 'dynamic', level: 'full' }])).toBe('DYNAMIC');
    expect(describeTeamQualities('neutral', [])).toBe('None');
  });
});

describe('summarizeSpecialTeams', () => {
  const base = { electric: null, fieldGoalRange: null, extraPointRange: null };

  it('lists each returner with ELECTRIC and the kicker with his ranges', () => {
    const [returns, kicking] = summarizeSpecialTeams([
      { ...base, position: 'KR', name: 'Ann Lee', electric: 'semi' },
      { ...base, position: 'PR', name: 'Bo Ray', electric: 'none' },
      { ...base, position: 'K', name: 'Cy Dunn', fieldGoalRange: 62, extraPointRange: 65 },
    ]);
    expect(returns.rows).toEqual([
      { label: 'Kick returner', value: 'Ann Lee' },
      { label: 'Kick quality', value: 'ELECTRIC•' },
      { label: 'Punt returner', value: 'Bo Ray' },
      { label: 'Punt quality', value: 'No quality' },
    ]);
    expect(kicking.rows).toEqual([
      { label: 'Kicker', value: 'Cy Dunn' },
      { label: 'FG range', value: '11-62' },
      { label: 'XP range', value: '11-65' },
    ]);
    expect(summarizeSpecialTeams([{ ...base, position: 'KR', name: 'X', electric: 'full' }])[0].rows[1].value).toBe('ELECTRIC');
  });

  it('says Not rolled for a roster saved before special teams were rolled', () => {
    const [returns, kicking] = summarizeSpecialTeams([
      { ...base, position: 'KR', name: 'Ann Lee' },
      { ...base, position: 'K', name: 'Cy Dunn' },
    ]);
    expect(returns.rows[1].value).toBe('Not rolled');
    expect(kicking.rows[1].value).toBe('Not rolled');
    expect(kicking.rows[2].value).toBe('Not rolled');
  });
});
