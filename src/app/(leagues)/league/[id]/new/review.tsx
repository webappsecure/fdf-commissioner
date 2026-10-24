import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ColorSwatch } from '@/components/color-swatch';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardFrame } from '@/components/wizard-frame';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { createLeagueTeams, TeamsError } from '@/db/teams';
import { describeDraftCoach } from '@/leagues/coach-draft';
import { findDraftProblem } from '@/leagues/league-draft';

export default function ReviewStep() {
  const router = useRouter();
  const { league, draft } = useLeagueDraft();
  const base = `/league/${league.id}/new` as const;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  const problem = findDraftProblem(league.size, league.structure, draft);

  async function create() {
    setSaving(true);
    setError(null);
    try {
      await createLeagueTeams(league.id, draft);
      router.replace(`/league/${league.id}`);
    } catch (caught) {
      if (caught instanceof TeamsError && caught.code === 'already-set-up') setAlreadySetUp(true);
      else setError('The teams could not be saved. Nothing was changed. Try again.');
      setSaving(false);
    }
  }

  return (
    <WizardFrame
      step={4}
      backHref={`${base}/coaches`}
      blocked={problem ? { message: 'Finish the earlier steps before creating the teams.', href: base } : undefined}
      nextLabel={saving ? 'Creating...' : 'Create teams'}
      nextDisabled={saving || alreadySetUp}
      onNext={create}>
      <ThemedText themeColor="textSecondary">Check everything, then create the teams. Nothing is saved until you do.</ThemedText>

      {alreadySetUp && (
        <>
          <ThemedText accessibilityRole="alert" style={styles.error}>This league already has teams.</ThemedText>
          <ActionButton label="Open league" onPress={() => router.replace(`/league/${league.id}`)} />
        </>
      )}
      {error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}

      {draft.teams.map((team, index) => {
        if (!team) return null;
        const divisionName = groupNameAt(draft.divisionNames, league.size, index);
        const previous = index > 0 ? groupNameAt(draft.divisionNames, league.size, index - 1) : null;
        return (
          <View key={index} style={styles.team}>
            {divisionName && divisionName !== previous && <ThemedText type="smallBold">{divisionName}</ThemedText>}
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.title}>
                <ColorSwatch color={team.primaryColor} />
                <ColorSwatch color={team.secondaryColor} />
                <ThemedText style={styles.titleText}>
                  {team.location} {team.name} ({team.alignment})
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {team.coach?.name}: {team.coach ? describeDraftCoach(team.coach) : ''}
              </ThemedText>
            </ThemedView>
          </View>
        );
      })}
    </WizardFrame>
  );
}

function groupNameAt(divisionNames: string[], size: number, slotIndex: number) {
  if (divisionNames.length === 0) return null;
  return divisionNames[Math.floor(slotIndex / (size / divisionNames.length))].trim();
}

const styles = StyleSheet.create({
  team: { gap: Spacing.one },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
  title: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleText: { flex: 1 },
  error: { color: ErrorTextColor },
});
