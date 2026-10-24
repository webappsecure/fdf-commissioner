import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ActionButton } from '@/components/action-button';
import { LeagueDraftProvider } from '@/components/league-draft-provider';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { listTeams } from '@/db/teams';
import type { League } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';

type SetupState = 'loading' | 'error' | 'needed' | 'done';

function WizardGate({ league }: { league: League }) {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    listTeams(league.id)
      .then((teams) => current && setSetup(teams.length > 0 ? 'done' : 'needed'))
      .catch(() => current && setSetup('error'));
    return () => {
      current = false;
    };
  }, [league.id, attempt]);

  if (setup === 'done') return <Redirect href={`/league/${league.id}`} />;
  if (setup === 'loading') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading league...</ThemedText>
      </Screen>
    );
  }
  if (setup === 'error') {
    return (
      <Screen>
        <ThemedText accessibilityRole="alert">The league could not be loaded.</ThemedText>
        <ActionButton
          label="Try again"
          onPress={() => {
            setSetup('loading');
            setAttempt((value) => value + 1);
          }}
        />
        <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  return (
    <LeagueDraftProvider league={league}>
      <Stack screenOptions={{ headerShown: false }} />
    </LeagueDraftProvider>
  );
}

export default function WizardLayout() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useLeague(parseLeagueId(rawId));

  return (
    <LeagueLoadGate state={state} onRetry={retry}>
      {(league) => <WizardGate league={league} />}
    </LeagueLoadGate>
  );
}
