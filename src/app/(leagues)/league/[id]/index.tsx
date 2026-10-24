import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { InfoRow } from '@/components/info-row';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { ColorSwatch } from '@/components/color-swatch';
import { deleteLeague, type League } from '@/db/leagues';
import type { TeamWithCoach } from '@/db/teams';
import { useTeams } from '@/hooks/use-teams';
import { summarizeCoach } from '@/rules/coach-tables';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';
import { describeLeague } from '@/leagues/structures';

function groupTeams(teams: TeamWithCoach[]) {
  const groups: { key: string; heading: string | null; teams: TeamWithCoach[] }[] = [];
  for (const team of teams) {
    const key = String(team.divisionId);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      const heading = team.divisionName && team.conferenceName ? `${team.conferenceName}: ${team.divisionName}` : team.divisionName;
      group = { key, heading, teams: [] };
      groups.push(group);
    }
    group.teams.push(team);
  }
  return groups;
}

function TeamsSection({ league }: { league: League }) {
  const router = useRouter();
  const { state, retry } = useTeams(league.id);

  if (state.status === 'loading') return <ThemedText themeColor="textSecondary">Loading teams...</ThemedText>;
  if (state.status === 'error') {
    return (
      <>
        <ThemedText accessibilityRole="alert" style={styles.error}>The teams could not be loaded.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{state.message}</ThemedText>
        <ActionButton label="Try again" onPress={retry} />
      </>
    );
  }
  if (state.teams.length === 0) {
    return (
      <>
        <ThemedText themeColor="textSecondary">This league has no teams yet.</ThemedText>
        <ActionButton label="Set up teams" variant="primary" onPress={() => router.push(`/league/${league.id}/new`)} />
      </>
    );
  }
  return (
    <View style={styles.rows}>
      {groupTeams(state.teams).map((group) => (
        <View key={group.key} style={styles.rows}>
          {group.heading && <ThemedText type="smallBold">{group.heading}</ThemedText>}
          {group.teams.map((team) => (
            <ThemedView key={team.id} type="backgroundElement" style={styles.team}>
              <View style={styles.teamTitle}>
                <ColorSwatch color={team.primaryColor} />
                <ColorSwatch color={team.secondaryColor} />
                <ThemedText style={styles.teamName}>
                  {team.location} {team.name} ({team.alignment})
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {team.coach.name}: {summarizeCoach(team.coach.age, team.coach.focus, team.coach.specialty, team.coach.gameDayQuality)}
              </ThemedText>
            </ThemedView>
          ))}
        </View>
      ))}
    </View>
  );
}

function LeagueHome({ league }: { league: League }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setDeleteFailed(false);
    try {
      await deleteLeague(league.id);
      router.replace('/');
    } catch {
      setDeleteFailed(true);
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{league.name}</ThemedText>

      <View style={styles.rows}>
        <InfoRow label="Size and structure" value={describeLeague(league.size, league.structure)} />
        <InfoRow label="Weekly Headline" value={league.weeklyHeadlineEnabled ? 'On' : 'Off'} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <TeamsSection league={league} />
      </ScrollView>

      {confirming ? (
        <ThemedView type="backgroundElement" style={styles.confirm}>
          <ThemedText type="smallBold">Delete {league.name}?</ThemedText>
          <ThemedText themeColor="textSecondary">This permanently removes the league and its teams and cannot be undone.</ThemedText>
          {deleteFailed && (
            <ThemedText accessibilityRole="alert" style={styles.error}>
              The league could not be deleted. Try again.
            </ThemedText>
          )}
          <ActionButton
            label={deleting ? 'Deleting...' : 'Delete league'}
            variant="danger"
            disabled={deleting}
            onPress={confirmDelete}
          />
          <ActionButton label="Cancel" disabled={deleting} onPress={() => setConfirming(false)} />
        </ThemedView>
      ) : (
        <View style={styles.actions}>
          <ActionButton label="Edit" variant="primary" onPress={() => router.push(`/league/${league.id}/edit`)} />
          <ActionButton label="Delete" onPress={() => setConfirming(true)} />
          <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
        </View>
      )}
    </Screen>
  );
}

export default function LeagueHomeScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useLeague(parseLeagueId(rawId));

  return (
    <LeagueLoadGate state={state} onRetry={retry}>
      {(league) => <LeagueHome league={league} />}
    </LeagueLoadGate>
  );
}

const styles = StyleSheet.create({
  rows: { gap: Spacing.two },
  scroll: { gap: Spacing.three },
  team: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
  teamTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  teamName: { flex: 1 },
  actions: { gap: Spacing.two },
  confirm: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three },
  error: { color: ErrorTextColor },
});
