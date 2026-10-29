import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ColorSwatch } from '@/components/color-swatch';
import { useRosterDraft } from '@/components/roster-draft-provider';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { createLeagueRosters, RostersError } from '@/db/players';
import { findRosterDraftProblem } from '@/leagues/roster-draft';

export default function RosterList() {
  const router = useRouter();
  const { league, teams, plans, rolledCount, rollAll } = useRosterDraft();
  const home = `/league/${league.id}` as const;
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRostered, setAlreadyRostered] = useState(false);
  const canSave = findRosterDraftProblem(teams, plans) === null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await createLeagueRosters(league.id, Object.values(plans));
      router.replace(home);
    } catch (caught) {
      if (caught instanceof RostersError && caught.code === 'already-rostered') setAlreadyRostered(true);
      else setError('The rosters could not be saved. Nothing was changed. Try again.');
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{league.name}</ThemedText>
      <ThemedText type="smallBold">
        {rolledCount} of {teams.length} teams rolled
      </ThemedText>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary">Roll the teams, open any team to look at it or reroll it, then save. Nothing is saved until you do.</ThemedText>

        {alreadyRostered && (
          <>
            <ThemedText accessibilityRole="alert" style={styles.error}>This league already has rosters.</ThemedText>
            <ActionButton label="Open league" onPress={() => router.replace(home)} />
          </>
        )}
        {error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}

        {teams.map((team) => {
          const rolled = Boolean(plans[team.id]);
          return (
            <Pressable
              key={team.id}
              accessibilityRole="button"
              accessibilityLabel={`${team.location} ${team.name}, ${rolled ? 'rolled' : 'not rolled'}`}
              onPress={() => router.push(`/league/${league.id}/rosters/${team.id}`)}>
              <ThemedView type="backgroundElement" style={styles.team}>
                <ColorSwatch color={team.primaryColor} />
                <ColorSwatch color={team.secondaryColor} />
                <ThemedText style={styles.teamName}>
                  {team.location} {team.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{rolled ? 'Rolled' : 'Not rolled'}</ThemedText>
              </ThemedView>
            </Pressable>
          );
        })}

        {confirmingCancel ? (
          <ThemedView type="backgroundElement" style={styles.confirm}>
            <ThemedText type="smallBold">Discard these rosters?</ThemedText>
            <ThemedText themeColor="textSecondary">The rosters you rolled are not saved yet and will be lost.</ThemedText>
            <ActionButton label="Discard and leave" variant="danger" onPress={() => router.replace(home)} />
            <ActionButton label="Keep editing" onPress={() => setConfirmingCancel(false)} />
          </ThemedView>
        ) : (
          <View style={styles.actions}>
            <ActionButton label="Roll all teams" disabled={saving || rolledCount === teams.length} onPress={rollAll} />
            <ActionButton
              label={saving ? 'Saving...' : 'Save rosters'}
              variant="primary"
              disabled={saving || alreadyRostered || !canSave}
              onPress={save}
            />
            <ActionButton label="Cancel" disabled={saving} onPress={() => (rolledCount > 0 ? setConfirmingCancel(true) : router.replace(home))} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
  team: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44, padding: Spacing.three, borderRadius: Spacing.three },
  teamName: { flex: 1 },
  actions: { gap: Spacing.two },
  confirm: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three },
  error: { color: ErrorTextColor },
});
