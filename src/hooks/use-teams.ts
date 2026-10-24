import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listTeams, type TeamWithCoach } from '@/db/teams';

export type TeamsState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; teams: TeamWithCoach[] };

export function useTeams(leagueId: number) {
  const [state, setState] = useState<TeamsState>({ status: 'loading' });

  const load = useCallback(() => {
    listTeams(leagueId)
      .then((teams) => setState({ status: 'ready', teams }))
      .catch((error) => setState({ status: 'error', message: error instanceof Error ? error.message : String(error) }));
  }, [leagueId]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}
