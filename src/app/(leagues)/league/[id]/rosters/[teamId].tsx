import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ColorSwatch } from '@/components/color-swatch';
import { PlayerRows } from '@/components/player-rows';
import { useRosterDraft } from '@/components/roster-draft-provider';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseLeagueId } from '@/leagues/league-input';
import { lineFromPlanned } from '@/leagues/roster-text';

export default function TeamPreview() {
  const router = useRouter();
  const { teamId: rawTeamId } = useLocalSearchParams<{ teamId: string }>();
  const { league, teams, plans, rollTeam } = useRosterDraft();
  const teamId = parseLeagueId(rawTeamId);
  const team = teams.find((candidate) => candidate.id === teamId);
  const plan = team ? plans[team.id] : undefined;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(`/league/${league.id}/rosters`);
  }

  if (!team) {
    return (
      <Screen>
        <ThemedText type="subtitle">Team not found</ThemedText>
        <ThemedText themeColor="textSecondary">This team is not in this league.</ThemedText>
        <ActionButton label="Back" onPress={goBack} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.title}>
        <ColorSwatch color={team.primaryColor} />
        <ColorSwatch color={team.secondaryColor} />
        <ThemedText type="subtitle" style={styles.titleText}>
          {team.location} {team.name}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {plan ? (
          <>
            <PlayerRows players={plan.players.map(lineFromPlanned)} />
            <ActionButton label="Reroll team" onPress={() => rollTeam(team.id)} />
          </>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">This team has not been rolled yet.</ThemedText>
            <ActionButton label="Roll this team" variant="primary" onPress={() => rollTeam(team.id)} />
          </>
        )}
        <ActionButton label="Back" onPress={goBack} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleText: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
});
