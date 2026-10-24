import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { League } from '@/db/leagues';
import type { CoachDraft } from '@/leagues/coach-draft';
import { newLeagueDraft, type LeagueDraft, type TeamDraft } from '@/leagues/league-draft';
import { layoutFor, type Alignment, type TeamLayout } from '@/leagues/team-layout';

type DraftContext = {
  league: League;
  layout: TeamLayout;
  draft: LeagueDraft;
  /** True once any team has been entered, so cancelling needs a confirmation. */
  dirty: boolean;
  setTeam: (slot: number, team: TeamDraft) => void;
  setGroupName: (kind: 'conference' | 'division', index: number, name: string) => void;
  setAlignment: (slot: number, alignment: Alignment) => void;
  setAlignments: (alignments: Alignment[]) => void;
  setCoach: (slot: number, coach: CoachDraft) => void;
  setCoaches: (coaches: CoachDraft[]) => void;
};

const Context = createContext<DraftContext | null>(null);

function withTeam(draft: LeagueDraft, slot: number, change: (team: TeamDraft) => TeamDraft): LeagueDraft {
  return { ...draft, teams: draft.teams.map((team, index) => (index === slot && team ? change(team) : team)) };
}

/** Holds the wizard's draft in memory. Nothing is saved until the review step. */
export function LeagueDraftProvider({ league, children }: { league: League; children: ReactNode }) {
  const [draft, setDraft] = useState(() => newLeagueDraft(league.size, league.structure));
  const layout = useMemo(() => layoutFor(league.size, league.structure), [league.size, league.structure]);

  const setTeam = useCallback((slot: number, team: TeamDraft) => {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((existing, index) =>
        index === slot ? { ...team, alignment: existing?.alignment ?? team.alignment, coach: existing?.coach ?? team.coach } : existing,
      ),
    }));
  }, []);
  const setGroupName = useCallback((kind: 'conference' | 'division', index: number, name: string) => {
    setDraft((current) => {
      const key = kind === 'conference' ? 'conferenceNames' : 'divisionNames';
      return { ...current, [key]: current[key].map((existing, position) => (position === index ? name : existing)) };
    });
  }, []);
  const setAlignment = useCallback((slot: number, alignment: Alignment) => {
    setDraft((current) => withTeam(current, slot, (team) => ({ ...team, alignment })));
  }, []);
  const setAlignments = useCallback((alignments: Alignment[]) => {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team, index) => (team ? { ...team, alignment: alignments[index] ?? team.alignment } : team)),
    }));
  }, []);
  const setCoach = useCallback((slot: number, coach: CoachDraft) => {
    setDraft((current) => withTeam(current, slot, (team) => ({ ...team, coach })));
  }, []);
  const setCoaches = useCallback((coaches: CoachDraft[]) => {
    setDraft((current) => ({
      ...current,
      teams: current.teams.map((team, index) => (team ? { ...team, coach: coaches[index] ?? team.coach } : team)),
    }));
  }, []);

  const value = useMemo(
    () => ({
      league,
      layout,
      draft,
      dirty: draft.teams.some((team) => team !== null),
      setTeam,
      setGroupName,
      setAlignment,
      setAlignments,
      setCoach,
      setCoaches,
    }),
    [league, layout, draft, setTeam, setGroupName, setAlignment, setAlignments, setCoach, setCoaches],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLeagueDraft() {
  const value = useContext(Context);
  if (!value) throw new Error('useLeagueDraft must be used inside LeagueDraftProvider');
  return value;
}
