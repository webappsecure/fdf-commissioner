import {
  combineTeamQualities,
  evaluateTeam,
  preventionQuality,
  scoringQuality,
  tendencyOf,
  type QualityPlayer,
} from './team-qualities';
import type { PlayerQuality, QualityName } from './player-tables';

const semi = (name: QualityName): PlayerQuality => ({ name, level: 'semi' });
const full = (name: QualityName): PlayerQuality => ({ name, level: 'full' });

describe('scoring and prevention bands', () => {
  it('uses the guide bands at every edge', () => {
    const cases: [number, string][] = [
      [16, 'dull'], [17, 'dull-semi'], [19, 'dull-semi'], [20, 'neutral'], [24, 'neutral'], [25, 'prolific-semi'], [27, 'prolific-semi'], [28, 'prolific'],
    ];
    for (const [sum, expected] of cases) expect(scoringQuality(sum)).toBe(expected);
  });

  it('uses the same bands for prevention', () => {
    const cases: [number, string][] = [
      [16, 'inept'], [17, 'inept-semi'], [19, 'inept-semi'], [20, 'neutral'], [24, 'neutral'], [25, 'staunch-semi'], [27, 'staunch-semi'], [28, 'staunch'],
    ];
    for (const [sum, expected] of cases) expect(preventionQuality(sum)).toBe(expected);
  });
});

describe('tendencyOf', () => {
  it('reads the pass and run gap', () => {
    expect(tendencyOf(12, 10)).toBe('neutral');
    expect(tendencyOf(13, 10)).toBe('P');
    expect(tendencyOf(14, 10)).toBe('P');
    expect(tendencyOf(15, 10)).toBe('P+');
    expect(tendencyOf(10, 12)).toBe('neutral');
    expect(tendencyOf(10, 13)).toBe('R');
    expect(tendencyOf(10, 14)).toBe('R');
    expect(tendencyOf(10, 15)).toBe('R+');
  });
});

describe('combineTeamQualities', () => {
  it('makes a full quality from two semis', () => {
    expect(combineTeamQualities([semi('dynamic'), semi('dynamic')])).toEqual([full('dynamic')]);
  });

  it('cancels opposites', () => {
    expect(combineTeamQualities([full('dynamic'), full('erratic')])).toEqual([]);
    expect(combineTeamQualities([semi('dynamic'), full('erratic')])).toEqual([semi('erratic')]);
    expect(combineTeamQualities([semi('dynamic'), semi('erratic')])).toEqual([]);
  });

  it('keeps a net of more than a full as full', () => {
    expect(combineTeamQualities([full('reliable'), full('reliable'), semi('reliable')])).toEqual([full('reliable')]);
  });

  it('counts Evasive as Solid and Hesitant as Porous', () => {
    expect(combineTeamQualities([semi('solid'), semi('evasive')])).toEqual([full('solid')]);
    expect(combineTeamQualities([semi('porous'), semi('hesitant')])).toEqual([full('porous')]);
    expect(combineTeamQualities([full('evasive'), semi('porous')])).toEqual([semi('solid')]);
  });

  it('lists results in pair order', () => {
    expect(combineTeamQualities([semi('dynamic'), semi('shaky')]).map((q) => q.name)).toEqual(['shaky', 'dynamic']);
  });
});

type Points = 0 | 1 | 2;

/** 11 starters whose pass + run points add up to `sum`, spread as evenly as possible. */
function starters(positions: string[], sum: number, extra: Record<number, PlayerQuality[]>): QualityPlayer[] {
  return positions.map((position, index) => {
    const points = Math.floor(sum / 11) + (index < sum % 11 ? 1 : 0);
    const rating = { pass: Math.ceil(points / 2) as Points, run: Math.floor(points / 2) as Points };
    return { position, rating, qualities: extra[index] ?? [] };
  });
}

const offense = (sum: number, extra: Record<number, PlayerQuality[]> = {}) =>
  starters(['QB', 'RB', 'WR', 'WR', 'WR', 'TE', 'OL', 'OL', 'OL', 'OL', 'OL'], sum, extra);
const defense = (sum: number, extra: Record<number, PlayerQuality[]> = {}) =>
  starters(['DT', 'DT', 'DE', 'DE', 'LB', 'LB', 'LB', 'CB', 'CB', 'FS', 'SS'], sum, extra);

describe('evaluateTeam', () => {
  it('sums the 11 offensive and 11 defensive starters and ignores special teams', () => {
    const kicker: QualityPlayer = { position: 'K', rating: null, qualities: [] };
    const result = evaluateTeam([...offense(22), ...defense(33), kicker], 'none');
    expect(result.offense).toMatchObject({ sum: 22, pass: 11, run: 11, scoring: 'neutral', tendency: 'neutral', qualities: [] });
    expect(result.defense).toMatchObject({ sum: 33, prevention: 'staunch' });
  });

  it('counts the coach efficient quality with offense players', () => {
    const result = evaluateTeam([...offense(22, { 0: [semi('efficient')] })], 'efficient-semi');
    expect(result.offense.qualities).toEqual([full('efficient')]);
    expect(evaluateTeam(offense(22, { 0: [full('efficient')] }), 'inefficient-semi').offense.qualities).toEqual([semi('efficient')]);
    expect(evaluateTeam(offense(22), 'inefficient-semi').offense.qualities).toEqual([semi('inefficient')]);
    expect(evaluateTeam(offense(22), 'none').offense.qualities).toEqual([]);
  });

  it('counts disciplined separately on offense and defense', () => {
    const result = evaluateTeam([...offense(22, { 0: [semi('disciplined')] }), ...defense(22, { 0: [semi('undisciplined')] })], 'none');
    expect(result.offense.qualities).toEqual([semi('disciplined')]);
    expect(result.defense.qualities).toEqual([semi('undisciplined')]);
  });

  it('removes ERRATIC from a PROLIFIC team and DYNAMIC from a DULL team, not the players', () => {
    const players = offense(33, { 0: [full('erratic')], 1: [semi('shaky')] });
    const prolific = evaluateTeam(players, 'none').offense;
    expect(prolific.scoring).toBe('prolific');
    expect(prolific.qualities).toEqual([semi('shaky')]);
    expect(players[0].qualities).toEqual([full('erratic')]);
    const dullSemi = evaluateTeam(offense(18, { 0: [full('dynamic')] }), 'none').offense;
    expect(dullSemi.scoring).toBe('dull-semi');
    expect(dullSemi.qualities).toEqual([]);
  });

  it('keeps ERRATIC and DYNAMIC on a neutral team', () => {
    const result = evaluateTeam(offense(22, { 0: [full('erratic')], 1: [full('dynamic')], 2: [semi('erratic')] }), 'none');
    expect(result.offense.scoring).toBe('neutral');
    expect(result.offense.qualities).toEqual([semi('erratic')]);
    expect(evaluateTeam(offense(22, { 0: [full('dynamic')] }), 'none').offense.qualities).toEqual([full('dynamic')]);
    expect(evaluateTeam(offense(22, { 0: [full('erratic')] }), 'none').offense.qualities).toEqual([full('erratic')]);
  });

  it('removes SOFT from a STAUNCH team and STIFF from an INEPT team', () => {
    const staunch = evaluateTeam(defense(33, { 0: [full('soft')], 1: [semi('passive')] }), 'none').defense;
    expect(staunch.prevention).toBe('staunch');
    expect(staunch.qualities).toEqual([semi('passive')]);
    const ineptSemi = evaluateTeam(defense(18, { 0: [full('stiff')], 1: [semi('active')] }), 'none').defense;
    expect(ineptSemi.prevention).toBe('inept-semi');
    expect(ineptSemi.qualities).toEqual([semi('active')]);
    const neutral = evaluateTeam(defense(22, { 0: [full('soft')], 1: [full('stiff')] }), 'none').defense;
    expect(neutral.qualities).toEqual([]);
  });
});
