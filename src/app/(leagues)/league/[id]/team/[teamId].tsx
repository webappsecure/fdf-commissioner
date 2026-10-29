import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ColorSwatch } from '@/components/color-swatch';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { PlayerRows } from '@/components/player-rows';
import { TeamQualitySummary } from '@/components/team-quality-summary';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { summarizeCoach } from '@/rules/coach-tables';
import { evaluateTeam } from '@/rules/team-qualities';
import type { League } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { useTeamRoster } from '@/hooks/use-team-roster';
import { parseLeagueId } from '@/leagues/league-input';
import { lineFromStored, summarizeSpecialTeams } from '@/leagues/roster-text';
import { useTeams } from '@/hooks/use-teams';

function TeamRoster({ league, teamId }: { league: League; teamId: number | null }) {
  const router = useRouter();
  const { state, retry } = useTeamRoster(league.id, teamId);
  const [view, setView] = useState<'team' | 'roster'>('team');
  const { state: teamsState } = useTeams(league.id);
  const home = `/league/${league.id}` as const;
  const colors = teamsState.status === 'ready' ? teamsState.teams.find((team) => team.id === teamId) : undefined;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(home);
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading roster...</ThemedText>
      </Screen>
    );
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <ThemedText accessibilityRole="alert">The roster could not be loaded.</ThemedText>
        <ActionButton label="Try again" onPress={retry} />
        <ActionButton label="Back" onPress={goBack} />
      </Screen>
    );
  }
  if (state.status === 'missing') {
    return (
      <Screen>
        <ThemedText type="subtitle">Team not found</ThemedText>
        <ThemedText themeColor="textSecondary">This team is not in this league.</ThemedText>
        <ActionButton label="Back" onPress={goBack} />
      </Screen>
    );
  }

  const { team, players } = state;
  const coach = teamsState.status === 'ready' ? colors?.coach : undefined;
  return (
    <Screen>
      <View style={styles.title}>
        {colors && <ColorSwatch color={colors.primaryColor} />}
        {colors && <ColorSwatch color={colors.secondaryColor} />}
        <ThemedText type="subtitle" style={styles.titleText}>
          {team.location} {team.name}
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {players.length === 0 ? (
          <>
            <ThemedText themeColor="textSecondary">This team has no roster yet.</ThemedText>
            <ActionButton label="Create rosters" variant="primary" onPress={() => router.replace(`/league/${league.id}/rosters`)} />
          </>
        ) : (
          <>
            <View style={styles.tabs}>
              {(['team', 'roster'] as const).map((name) => (
                <View key={name} style={styles.tab}>
                  <ActionButton label={name === 'team' ? 'Team' : 'Roster'} variant={view === name ? 'primary' : 'secondary'} onPress={() => setView(name)} />
                </View>
              ))}
            </View>
            {view === 'roster' ? (
              <PlayerRows players={players.map(lineFromStored)} />
            ) : coach ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {coach.name}: {summarizeCoach(coach.age, coach.focus, coach.specialty, coach.gameDayQuality)}
                </ThemedText>
                <TeamQualitySummary evaluation={evaluateTeam(players, coach.gameDayQuality)} specialTeams={summarizeSpecialTeams(players)} />
              </>
            ) : (
              <ThemedText themeColor="textSecondary">
                {teamsState.status === 'error' ? 'The team qualities could not be loaded.' : 'Loading team qualities...'}
              </ThemedText>
            )}
          </>
        )}
        <ActionButton label="Back" onPress={goBack} />
      </ScrollView>
    </Screen>
  );
}

export default function TeamRosterScreen() {
  const { id: rawId, teamId: rawTeamId } = useLocalSearchParams<{ id: string; teamId: string }>();
  const { state, retry } = useLeague(parseLeagueId(rawId));

  return (
    <LeagueLoadGate state={state} onRetry={retry}>
      {(league) => <TeamRoster league={league} teamId={parseLeagueId(rawTeamId)} />}
    </LeagueLoadGate>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleText: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.two },
  tab: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
});
