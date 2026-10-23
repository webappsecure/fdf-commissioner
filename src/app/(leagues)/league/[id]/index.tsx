import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { LeagueNotFound } from '@/components/league-not-found';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { deleteLeague, type League } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';
import { describeLeague } from '@/leagues/structures';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText>{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{value}</ThemedText>
    </ThemedView>
  );
}

export default function LeagueHomeScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseLeagueId(rawId);
  const { state, retry } = useLeague(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function confirmDelete(league: League) {
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

  if (state.status === 'missing') {
    return (
      <Screen>
        <LeagueNotFound />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading league...</ThemedText>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <ThemedText accessibilityRole="alert">The league could not be loaded.</ThemedText>
        <ActionButton label="Try again" onPress={retry} />
        <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const { league } = state;

  return (
    <Screen>
      <ThemedText type="subtitle">{league.name}</ThemedText>

      <View style={styles.rows}>
        <Row label="Size and structure" value={describeLeague(league.size, league.structure)} />
        <Row label="Weekly Headline" value={league.weeklyHeadlineEnabled ? 'On' : 'Off'} />
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
            onPress={() => confirmDelete(league)}
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

const styles = StyleSheet.create({
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.three, borderRadius: Spacing.three },
  actions: { gap: Spacing.two },
  confirm: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three },
  error: { color: ErrorTextColor },
});
