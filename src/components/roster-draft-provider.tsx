import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { League } from '@/db/leagues';
import { rollMissingRosters, rollTeamRoster, type RosterDraft } from '@/leagues/roster-draft';
import type { Alignment } from '@/leagues/team-layout';

export type DraftTeam = {
  id: number;
  location: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  /** The stored alignment, or null until roster creation flips it. */
  alignment: Alignment | null;
};

type DraftContext = {
  league: League;
  teams: DraftTeam[];
  plans: RosterDraft;
  rolledCount: number;
  rollTeam: (teamId: number) => void;
  rollAll: () => void;
};

const Context = createContext<DraftContext | null>(null);

/** Holds the rolled rosters in memory. Nothing is saved until the commissioner saves them. */
export function RosterDraftProvider({ league, teams, children }: { league: League; teams: DraftTeam[]; children: ReactNode }) {
  const [plans, setPlans] = useState<RosterDraft>({});

  const rollTeam = useCallback((teamId: number) => setPlans((current) => rollTeamRoster(teams, current, teamId)), [teams]);
  const rollAll = useCallback(() => setPlans((current) => rollMissingRosters(teams, current)), [teams]);

  const value = useMemo(
    () => ({ league, teams, plans, rolledCount: Object.keys(plans).length, rollTeam, rollAll }),
    [league, teams, plans, rollTeam, rollAll],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRosterDraft() {
  const value = useContext(Context);
  if (!value) throw new Error('useRosterDraft must be used inside RosterDraftProvider');
  return value;
}
