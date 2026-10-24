import { defineTable } from './tables';

export type CoachFocus = 'offense' | 'defense';

export type CoachSpecialty =
  | 'talent-spotter'
  | 'qb-development'
  | 'offensive-line-guru'
  | 'rb-development'
  | 'receivers-coach'
  | 'defensive-line-guru'
  | 'lb-development'
  | 'secondary-coach'
  | 'special-teams-coach';

export type GameDayQuality = 'inefficient' | 'inefficient-semi' | 'none' | 'efficient-semi' | 'efficient';

// Guide section 3.1.1 (page 7).
export const COACH_AGE_TABLE = defineTable<number>('Head Coach Age', [
  { range: '11', result: 39 },
  { range: '12', result: 40 },
  { range: '13', result: 41 },
  { range: '14', result: 42 },
  { range: '15', result: 43 },
  { range: '16', result: 44 },
  { range: '21', result: 45 },
  { range: '22', result: 46 },
  { range: '23-24', result: 47 },
  { range: '25-26', result: 48 },
  { range: '31-32', result: 49 },
  { range: '33-34', result: 50 },
  { range: '35-36', result: 51 },
  { range: '41-42', result: 52 },
  { range: '43-44', result: 53 },
  { range: '45-46', result: 54 },
  { range: '51', result: 55 },
  { range: '52', result: 56 },
  { range: '53', result: 57 },
  { range: '54', result: 58 },
  { range: '55', result: 59 },
  { range: '56', result: 60 },
  { range: '61', result: 61 },
  { range: '62', result: 62 },
  { range: '63', result: 63 },
  { range: '64', result: 64 },
  { range: '65', result: 65 },
  { range: '66', result: 66 },
]);

// Section 3.1.2.
export const COACH_FOCUS_TABLE = defineTable<CoachFocus>('Head Coach Focus', [
  { range: '11-42', result: 'offense' },
  { range: '43-66', result: 'defense' },
]);

// Section 3.1.3.
export const OFFENSE_SPECIALTY_TABLE = defineTable<CoachSpecialty>('Offense Focused Head Coach', [
  { range: '11-16', result: 'talent-spotter' },
  { range: '21-26', result: 'qb-development' },
  { range: '31-36', result: 'offensive-line-guru' },
  { range: '41-46', result: 'rb-development' },
  { range: '51-56', result: 'receivers-coach' },
  { range: '61-66', result: 'special-teams-coach' },
]);

export const DEFENSE_SPECIALTY_TABLE = defineTable<CoachSpecialty>('Defense Focused Head Coach', [
  { range: '11-16', result: 'talent-spotter' },
  { range: '21-32', result: 'defensive-line-guru' },
  { range: '33-44', result: 'lb-development' },
  { range: '45-56', result: 'secondary-coach' },
  { range: '61-66', result: 'special-teams-coach' },
]);

// Section 3.1.4. The guide prints "21-54" for no quality, which overlaps 12-22. The commissioner chose
// 23-54, which keeps the odds symmetric (1, 7, 20, 7, 1 of 36).
export const GAME_DAY_QUALITY_TABLE = defineTable<GameDayQuality>('Game Day Quality', [
  { range: '11', result: 'inefficient' },
  { range: '12-22', result: 'inefficient-semi' },
  { range: '23-54', result: 'none' },
  { range: '55-65', result: 'efficient-semi' },
  { range: '66', result: 'efficient' },
]);

export function specialtyTableFor(focus: CoachFocus) {
  return focus === 'offense' ? OFFENSE_SPECIALTY_TABLE : DEFENSE_SPECIALTY_TABLE;
}

export const FOCUS_LABELS: Record<CoachFocus, string> = { offense: 'Offense', defense: 'Defense' };

export const SPECIALTY_INFO: Record<CoachSpecialty, { label: string; effect: string }> = {
  'talent-spotter': { label: 'Talent Spotter', effect: '+1 to all annual draft rolls for their focus side' },
  'qb-development': { label: 'QB Development', effect: '+1 to all QB development rolls' },
  'offensive-line-guru': { label: 'Offensive Line Guru', effect: '+1 to all OL development rolls' },
  'rb-development': { label: 'RB Development', effect: '+1 to all RB development rolls' },
  'receivers-coach': { label: 'Receivers Coach', effect: '+1 to all WR/TE development rolls' },
  'defensive-line-guru': { label: 'Defensive Line Guru', effect: '+1 to all DL development rolls' },
  'lb-development': { label: 'LB Development', effect: '+1 to all LB development rolls' },
  'secondary-coach': { label: 'Secondary Coach', effect: '+1 to all CB/SS/FS development rolls' },
  'special-teams-coach': { label: 'Special Teams Coach', effect: 'Kickers (offense) or return specialists (defense) get +1 to development rolls' },
};

export const GAME_DAY_LABELS: Record<GameDayQuality, string> = {
  inefficient: 'INEFFICIENT',
  'inefficient-semi': 'INEFFICIENT•',
  none: 'No quality',
  'efficient-semi': 'EFFICIENT•',
  efficient: 'EFFICIENT',
};

export function summarizeCoach(age: number, focus: CoachFocus, specialty: CoachSpecialty, quality: GameDayQuality) {
  return `Age ${age}, ${FOCUS_LABELS[focus]}, ${SPECIALTY_INFO[specialty].label}, ${GAME_DAY_LABELS[quality]}`;
}
