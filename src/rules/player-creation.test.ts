import {
  createPlayer,
  createPlayerDraft,
  isPlayerComplete,
  mergeQualities,
  playerRolls,
  rollPlayerAge,
  rollPlayerQuality,
  rollPlayerElectric,
  rollPlayerExtraPoint,
  rollPlayerFieldGoal,
  rollPlayerQualityCount,
  rollPlayerRating,
  type PlayerDraft,
} from './player-creation';
import { isGradedPosition, PLAYER_POSITIONS, type PlayerQuality } from './player-tables';

const semi = (name: PlayerQuality['name']): PlayerQuality => ({ name, level: 'semi' });
const full = (name: PlayerQuality['name']): PlayerQuality => ({ name, level: 'full' });

/** A random function that yields these dice in order: tens die then ones die for each 2d6 roll. */
function dice(...values: number[]) {
  let index = 0;
  return () => (values[index++] - 0.5) / 6;
}

type Step = (draft: PlayerDraft, options: { manual?: string }) => ReturnType<typeof rollPlayerAge>;

/** Applies typed rolls in order and returns the resulting draft. */
function build(position: PlayerDraft['position'], ...steps: [Step, string][]) {
  let draft = createPlayerDraft(position);
  for (const [step, manual] of steps) {
    const next = step(draft, { manual });
    if (next.ok) draft = next.draft;
  }
  return draft;
}

describe('mergeQualities', () => {
  it('keeps a single semi or full quality', () => {
    expect(mergeQualities([semi('shaky')])).toEqual([semi('shaky')]);
    expect(mergeQualities([full('reliable')])).toEqual([full('reliable')]);
    expect(mergeQualities([])).toEqual([]);
  });

  it('makes a full quality from two semis of the same quality', () => {
    expect(mergeQualities([semi('dynamic'), semi('dynamic')])).toEqual([full('dynamic')]);
  });

  it('loses steps past full', () => {
    expect(mergeQualities([semi('shaky'), full('shaky')])).toEqual([full('shaky')]);
    expect(mergeQualities([full('reliable'), full('reliable')])).toEqual([full('reliable')]);
    expect(mergeQualities([full('reliable'), semi('reliable')])).toEqual([full('reliable')]);
  });

  it('cancels a semi against its opposite semi', () => {
    expect(mergeQualities([semi('shaky'), semi('reliable')])).toEqual([]);
    expect(mergeQualities([semi('active'), semi('passive')])).toEqual([]);
  });

  it('moves a full quality one step for a semi opposite', () => {
    expect(mergeQualities([full('shaky'), semi('reliable')])).toEqual([semi('shaky')]);
    expect(mergeQualities([semi('reliable'), full('shaky')])).toEqual([semi('shaky')]);
  });

  it('cancels a full quality against its full opposite', () => {
    expect(mergeQualities([full('shaky'), full('reliable')])).toEqual([]);
  });

  it('moves a semi quality past none when the opposite is full', () => {
    expect(mergeQualities([semi('shaky'), full('reliable')])).toEqual([semi('reliable')]);
  });

  it('keeps qualities from different pairs separate', () => {
    expect(mergeQualities([semi('erratic'), semi('clumsy')])).toEqual([semi('erratic'), semi('clumsy')]);
    expect(mergeQualities([semi('erratic'), semi('clumsy'), semi('dynamic')])).toEqual([semi('clumsy')]);
  });

  it('rejects a quality that is on no pair', () => {
    expect(() => mergeQualities([semi('electric' as never)])).toThrow('Unknown quality');
  });
});

describe('createPlayer', () => {
  it.each(PLAYER_POSITIONS)('%s is complete and rolled in guide order', (position) => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let attempt = 0; attempt < 50; attempt++) {
      const draft = createPlayer(position, random);
      expect(isPlayerComplete(draft)).toBe(true);
      expect(draft.age?.outcome).toBeGreaterThanOrEqual(22);
      const steps = playerRolls(draft).map((entry) => entry.step);
      if (isGradedPosition(position)) {
        expect(steps).toEqual(position === 'K' ? ['age', 'grade', 'field-goal', 'extra-point'] : ['age', 'grade', 'electric']);
        expect(draft.electric !== null).toBe(position !== 'K');
        expect(draft.fieldGoal !== null).toBe(position === 'K');
        expect(draft.rating).toBeNull();
        expect(draft.qualityCount).toBeNull();
        expect(draft.qualities).toEqual([]);
      } else {
        const count = draft.qualityCount!.outcome!;
        expect(steps).toEqual(['age', 'rating', 'quality-count', ...Array<string>(count).fill('quality')]);
        expect(draft.grade).toBeNull();
        expect(draft.qualities.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('builds a QB from fixed dice', () => {
    // age 11 = 22; rating 66 = 2/1; count 66 = two qualities; 1/2 or 2/1 column: 64 reliable, then 11 inefficient•
    const draft = createPlayer('QB', dice(1, 1, 6, 6, 6, 6, 6, 4, 1, 1));
    expect(draft.age?.outcome).toBe(22);
    expect(draft.rating?.outcome).toEqual({ pass: 2, run: 1 });
    expect(draft.qualityCount?.outcome).toBe(2);
    expect(draft.qualityRolls.map((roll) => roll.outcome)).toEqual([full('reliable'), semi('inefficient')]);
    expect(draft.qualities).toEqual([full('reliable'), semi('inefficient')]);
  });

  it('uses the chart column for the rolled rating', () => {
    // age 11; rating 11 = 0/1; count 66 = two; 0/1 column: 11 shaky, 11 shaky, which stays full
    const draft = createPlayer('QB', dice(1, 1, 1, 1, 6, 6, 1, 1, 1, 1, 1, 1));
    expect(draft.rating?.outcome).toEqual({ pass: 0, run: 1 });
    expect(draft.qualityRolls.map((roll) => roll.table)).toEqual(['QB Quality Chart 0/1 or 1/0', 'QB Quality Chart 0/1 or 1/0']);
    expect(draft.qualities).toEqual([full('shaky')]);
  });

  it('cancels opposite results', () => {
    // age 11; WR rating 66 = 2/1; count 66 = two; 2/1 column: 14 shaky•, then 31 reliable•
    const draft = createPlayer('WR', dice(1, 1, 6, 6, 6, 6, 1, 4, 3, 1));
    expect(draft.qualityRolls.map((roll) => roll.outcome)).toEqual([semi('shaky'), semi('reliable')]);
    expect(draft.qualities).toEqual([]);
  });
});

describe('special teams rolls', () => {
  it('rolls ELECTRIC by the returner grade', () => {
    // grade 64 = A; ELECTRIC A: 11 none, 22 semi, 42 full
    const graded = build('PR', [rollPlayerRating, '64']);
    for (const [roll, outcome] of [['11', 'none'], ['22', 'semi'], ['42', 'full']] as const) {
      const result = rollPlayerElectric(graded, { manual: roll });
      expect(result.ok && result.draft.electric?.outcome).toBe(outcome);
    }
  });

  it('rolls the kicker FG and XP ranges by grade', () => {
    const kicker = build('K', [rollPlayerRating, '11']); // grade D
    const fg = rollPlayerFieldGoal(kicker, { manual: '12' });
    expect(fg.ok && fg.draft.fieldGoal).toMatchObject({ outcome: 51, table: 'Kicker FG range (Grade D)' });
    const xp = rollPlayerExtraPoint(kicker, { manual: '26' });
    expect(xp.ok && xp.draft.extraPoint?.outcome).toBe(61);
  });

  it('does nothing without a grade or for another position', () => {
    const bare = createPlayerDraft('K');
    expect(rollPlayerFieldGoal(bare, { manual: '11' })).toEqual({ ok: true, draft: bare });
    const qb = createPlayerDraft('QB');
    expect(rollPlayerElectric(qb, { manual: '11' })).toEqual({ ok: true, draft: qb });
    const kr = build('KR', [rollPlayerRating, '64']);
    expect(rollPlayerFieldGoal(kr, { manual: '11' })).toEqual({ ok: true, draft: kr });
    expect(rollPlayerExtraPoint(kr, { manual: '11' })).toEqual({ ok: true, draft: kr });
    expect(rollPlayerElectric(build('K', [rollPlayerRating, '64']), { manual: '11' }).ok).toBe(true);
  });

  it('clears the special teams rolls when the grade is rolled again', () => {
    const kicker = build('K', [rollPlayerRating, '64'], [rollPlayerFieldGoal, '11'], [rollPlayerExtraPoint, '11']);
    const again = rollPlayerRating(kicker, { manual: '11' });
    expect(again.ok && again.draft.fieldGoal).toBeNull();
    expect(again.ok && again.draft.extraPoint).toBeNull();
  });
});

describe('player steps', () => {
  it('uses a typed roll and marks it manual', () => {
    const result = rollPlayerAge(createPlayerDraft('K'), { manual: '66' });
    expect(result.ok && result.draft.age).toMatchObject({ outcome: 33, manual: true, dice: 66, table: 'K Age' });
  });

  it('returns an error and changes nothing for a bad typed roll', () => {
    const draft = createPlayerDraft('QB');
    expect(rollPlayerAge(draft, { manual: '17' })).toEqual({ ok: false, error: 'out-of-range' });
    expect(rollPlayerAge(draft, { manual: 'ab' })).toEqual({ ok: false, error: 'not-a-roll' });
    expect(rollPlayerRating(draft, { manual: '' })).toEqual({ ok: false, error: 'empty' });
    expect(draft).toEqual(createPlayerDraft('QB'));
  });

  it('needs a rating before a count and a count before a quality', () => {
    const bare = createPlayerDraft('RB');
    expect(rollPlayerQualityCount(bare, { manual: '66' })).toEqual({ ok: true, draft: bare });
    const rated = build('RB', [rollPlayerRating, '31']);
    expect(rollPlayerQuality(rated, { manual: '11' })).toEqual({ ok: true, draft: rated });
  });

  it('skips the count and qualities for graded positions', () => {
    const graded = build('KR', [rollPlayerRating, '64']);
    expect(graded.grade?.outcome).toBe('A');
    expect(graded.rating).toBeNull();
    expect(rollPlayerQualityCount(graded, { manual: '66' })).toEqual({ ok: true, draft: graded });
    expect(rollPlayerQuality(graded, { manual: '11' })).toEqual({ ok: true, draft: graded });
  });

  it('stops rolling qualities at the rolled count', () => {
    const draft = build('WR', [rollPlayerRating, '32'], [rollPlayerQualityCount, '63'], [rollPlayerQuality, '13']);
    expect(draft.qualities).toEqual([semi('shaky')]);
    expect(rollPlayerQuality(draft, { manual: '66' })).toEqual({ ok: true, draft });
  });

  it('clears the count and qualities when the rating is rolled again', () => {
    const draft = build('WR', [rollPlayerRating, '32'], [rollPlayerQualityCount, '63'], [rollPlayerQuality, '13']);
    const again = rollPlayerRating(draft, { manual: '61' });
    expect(again.ok && again.draft.qualityCount).toBeNull();
    expect(again.ok && again.draft.qualityRolls).toEqual([]);
    expect(again.ok && again.draft.qualities).toEqual([]);
  });

  it('is not complete until every quality is rolled', () => {
    const draft = build('QB', [rollPlayerAge, '11'], [rollPlayerRating, '61'], [rollPlayerQualityCount, '62']);
    expect(isPlayerComplete(draft)).toBe(false);
  });

  it('is not complete when a roll found no result', () => {
    const draft = build('QB', [rollPlayerAge, '11'], [rollPlayerRating, '61'], [rollPlayerQualityCount, '11']);
    expect(isPlayerComplete(draft)).toBe(true);
    expect(isPlayerComplete({ ...draft, age: { ...draft.age!, outcome: null } })).toBe(false);
    expect(isPlayerComplete({ ...draft, rating: { ...draft.rating!, outcome: null } })).toBe(false);
    expect(isPlayerComplete({ ...draft, qualityCount: { ...draft.qualityCount!, outcome: null } })).toBe(false);
    const kicker = build('K', [rollPlayerAge, '11'], [rollPlayerRating, '64'], [rollPlayerFieldGoal, '11'], [rollPlayerExtraPoint, '11']);
    expect(isPlayerComplete(kicker)).toBe(true);
    expect(isPlayerComplete({ ...kicker, grade: { ...kicker.grade!, outcome: null } })).toBe(false);
    expect(isPlayerComplete({ ...kicker, fieldGoal: { ...kicker.fieldGoal!, outcome: null } })).toBe(false);
    expect(isPlayerComplete({ ...kicker, extraPoint: null })).toBe(false);
    const returner = build('KR', [rollPlayerAge, '11'], [rollPlayerRating, '64'], [rollPlayerElectric, '11']);
    expect(isPlayerComplete(returner)).toBe(true);
    expect(isPlayerComplete({ ...returner, electric: null })).toBe(false);
    const withQuality = build('WR', [rollPlayerAge, '11'], [rollPlayerRating, '32'], [rollPlayerQualityCount, '63'], [rollPlayerQuality, '13']);
    expect(isPlayerComplete(withQuality)).toBe(true);
    expect(isPlayerComplete({ ...withQuality, qualityRolls: [{ ...withQuality.qualityRolls[0], outcome: null }] })).toBe(false);
  });

  it('lists the rolls in guide order', () => {
    const draft = build('QB', [rollPlayerAge, '11'], [rollPlayerRating, '61'], [rollPlayerQualityCount, '62'], [rollPlayerQuality, '64'], [rollPlayerQuality, '11']);
    expect(playerRolls(draft).map((entry) => entry.step)).toEqual(['age', 'rating', 'quality-count', 'quality', 'quality']);
    expect(playerRolls(draft).every((entry) => entry.roll.manual)).toBe(true);
  });
});
