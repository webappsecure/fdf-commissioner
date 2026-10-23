import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import type { League } from '@/db/leagues';
import type { LeagueState } from '@/hooks/use-league';

import { ActionButton } from './action-button';
import { LeagueNotFound } from './league-not-found';
import { Screen } from './screen';
import { ThemedText } from './themed-text';

type LeagueLoadGateProps = {
  state: LeagueState;
  onRetry?: () => void;
  children: (league: League) => ReactNode;
};

export function LeagueLoadGate({ state, onRetry, children }: LeagueLoadGateProps) {
  const router = useRouter();

  if (state.status === 'ready') return <>{children(state.league)}</>;

  return (
    <Screen>
      {state.status === 'missing' && <LeagueNotFound />}
      {state.status === 'loading' && <ThemedText themeColor="textSecondary">Loading league...</ThemedText>}
      {state.status === 'error' && (
        <>
          <ThemedText accessibilityRole="alert">The league could not be loaded.</ThemedText>
          {onRetry && <ActionButton label="Try again" onPress={onRetry} />}
          <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
        </>
      )}
    </Screen>
  );
}
