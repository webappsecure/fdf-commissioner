import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { InfoRow } from '@/components/info-row';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { deleteLeague, type League } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';
import { describeLeague } from '@/leagues/structures';

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

      {confirming ? (
        <ThemedView type="backgroundElement" style={styles.confirm}>
          <ThemedText type="smallBold">Delete {league.name}?</ThemedText>
          <ThemedText themeColor="textSecondary">This permanently removes the league and cannot be undone.</ThemedText>
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
  actions: { gap: Spacing.two },
  confirm: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three },
  error: { color: ErrorTextColor },
});
