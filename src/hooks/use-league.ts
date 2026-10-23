import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getLeague, type League } from '@/db/leagues';

export type LeagueState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; league: League };

export function useLeague(id: number | null) {
  const [state, setState] = useState<LeagueState>(id === null ? { status: 'missing' } : { status: 'loading' });

  const load = useCallback(() => {
    if (id === null) return;
    getLeague(id)
      .then((league) => setState(league ? { status: 'ready', league } : { status: 'missing' }))
      .catch(() => setState({ status: 'error' }));
  }, [id]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}
