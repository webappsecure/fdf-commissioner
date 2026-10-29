import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ActionButton } from '@/components/action-button';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { RosterDraftProvider, type DraftTeam } from '@/components/roster-draft-provider';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import type { League } from '@/db/leagues';
import { listRosterTeams } from '@/db/players';
import { listTeams } from '@/db/teams';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';

type GateState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; teams: DraftTeam[]; rostered: boolean };

function RosterGate({ league }: { league: League }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    Promise.all([listTeams(league.id), listRosterTeams(league.id)])
      .then(([teams, stored]) => {
        if (!current) return;
        const alignments = new Map(stored.map((team) => [team.id, team.alignment]));
        setState({
          status: 'ready',
          rostered: teams.some((team) => team.playerCount > 0),
          teams: teams.map((team) => ({
            id: team.id,
            location: team.location,
            name: team.name,
            primaryColor: team.primaryColor,
            secondaryColor: team.secondaryColor,
            alignment: alignments.get(team.id) ?? null,
          })),
        });
      })
      .catch(() => current && setState({ status: 'error' }));
    return () => {
      current = false;
    };
  }, [league.id, attempt]);

  if (state.status === 'loading') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading teams...</ThemedText>
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <ThemedText accessibilityRole="alert">The teams could not be loaded.</ThemedText>
        <ActionButton
          label="Try again"
          onPress={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        />
        <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (state.rostered) return <Redirect href={`/league/${league.id}`} />;
  if (state.teams.length === 0) {
    return (
      <Screen>
        <ThemedText type="subtitle">{league.name}</ThemedText>
        <ThemedText themeColor="textSecondary">This league has no teams yet. Set up the teams before creating rosters.</ThemedText>
        <ActionButton label="Set up teams" variant="primary" onPress={() => router.replace(`/league/${league.id}/new`)} />
        <ActionButton label="Back" onPress={() => router.replace(`/league/${league.id}`)} />
      </Screen>
    );
  }
  return (
    <RosterDraftProvider league={league} teams={state.teams}>
      <Stack screenOptions={{ headerShown: false }} />
    </RosterDraftProvider>
  );
}

export default function RostersLayout() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useLeague(parseLeagueId(rawId));

  return (
    <LeagueLoadGate state={state} onRetry={retry}>
      {(league) => <RosterGate league={league} />}
    </LeagueLoadGate>
  );
}
