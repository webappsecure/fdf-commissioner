import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { Choice } from '@/components/choice';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardFrame } from '@/components/wizard-frame';
import { Spacing } from '@/constants/theme';
import { flipAlignment } from '@/leagues/team-layout';

export default function AlignmentStep() {
  const router = useRouter();
  const { league, draft, setAlignment, setAlignments } = useLeagueDraft();
  const base = `/league/${league.id}/new` as const;
  const teamsDone = draft.teams.every((team) => team !== null);
  const alignmentsDone = draft.teams.every((team) => team?.alignment);

  return (
    <WizardFrame
      step={2}
      backHref={base}
      blocked={teamsDone ? undefined : { message: 'Enter every team first.', href: base }}
      nextDisabled={!alignmentsDone}
      onNext={() => router.push(`${base}/coaches`)}>
      <ThemedText themeColor="textSecondary">
        A coin flip sets each team&apos;s defense: heads is 4-3, tails is 3-4. You can flip again or choose by hand.
      </ThemedText>
      <ActionButton label="Flip for all teams" onPress={() => setAlignments(draft.teams.map(() => flipAlignment()))} />

      {draft.teams.map((team, index) =>
        team ? (
          <ThemedView key={index} type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">
              {team.location} {team.name}
            </ThemedText>
            <View style={styles.choices} accessibilityRole="radiogroup">
              <Choice label="4-3" selected={team.alignment === '4-3'} onPress={() => setAlignment(index, '4-3')} />
              <Choice label="3-4" selected={team.alignment === '3-4'} onPress={() => setAlignment(index, '3-4')} />
              <ActionButton label="Flip" onPress={() => setAlignment(index, flipAlignment())} />
            </View>
            {!team.alignment && <ThemedText type="small" themeColor="textSecondary">Not set</ThemedText>}
          </ThemedView>
        ) : null,
      )}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
});
