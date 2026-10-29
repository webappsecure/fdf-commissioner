import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listPlayers, listRosterTeams, type RosterTeam, type StoredPlayer } from '@/db/players';

export type TeamRosterState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; team: RosterTeam; players: StoredPlayer[] };

/** Loads one team of a league and its saved players. A team outside the league is `missing`. */
export function useTeamRoster(leagueId: number, teamId: number | null) {
  const [state, setState] = useState<TeamRosterState>(teamId === null ? { status: 'missing' } : { status: 'loading' });

  const load = useCallback(() => {
    if (teamId === null) return;
    listRosterTeams(leagueId)
      .then(async (teams) => {
        const team = teams.find((candidate) => candidate.id === teamId);
        if (!team) return setState({ status: 'missing' });
        setState({ status: 'ready', team, players: await listPlayers(teamId) });
      })
      .catch(() => setState({ status: 'error' }));
  }, [leagueId, teamId]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}
