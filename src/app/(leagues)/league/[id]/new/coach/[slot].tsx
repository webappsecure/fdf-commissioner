import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  coachNameProblem,
  rollCoachAge,
  rollCoachFocus,
  rollCoachGameDay,
  rollCoachSpecialty,
  rollWholeCoach,
  type CoachDraft,
} from '@/leagues/coach-draft';
import { MAX_COACH_NAME_LENGTH, pickCoachName } from '@/leagues/coach-names';
import { parseSlot } from '@/leagues/team-layout';
import { FOCUS_LABELS, GAME_DAY_LABELS, SPECIALTY_INFO } from '@/rules/coach-tables';
import type { ManualRollError } from '@/rules/dice';
import type { RollResult } from '@/rules/roll';

type RollOptions = { manual?: string };
type Applied = { ok: true; draft: CoachDraft } | { ok: false; error: ManualRollError };

const MANUAL_ERRORS: Record<ManualRollError, string> = {
  empty: 'Type a roll first.',
  'not-a-roll': 'Type two digits, like 35.',
  'out-of-range': 'Each die is 1 to 6.',
};

function rolled(result: RollResult | null, text: string | null) {
  if (!result || text === null) return 'Not rolled';
  return `${text} (roll ${result.final}${result.manual ? ', typed' : ''})`;
}

function RollRow({
  label,
  shown,
  disabledReason,
  onRoll,
}: {
  label: string;
  shown: string;
  disabledReason?: string;
  onRoll: (options: RollOptions) => Applied;
}) {
  const theme = useTheme();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  function apply(options: RollOptions) {
    const result = onRoll(options);
    if (result.ok) {
      setError(null);
      setTyped('');
    } else {
      setError(MANUAL_ERRORS[result.error]);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.rollRow}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{shown}</ThemedText>
      {disabledReason ? (
        <ThemedText type="small" themeColor="textSecondary">{disabledReason}</ThemedText>
      ) : (
        <>
          <ActionButton label={`Roll ${label.toLowerCase()}`} onPress={() => apply({})} />
          <View style={styles.typedRow}>
            <TextInput
              accessibilityLabel={`${label} typed roll`}
              placeholder="Typed roll, like 35"
              placeholderTextColor={theme.textSecondary}
              value={typed}
              onChangeText={setTyped}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <ActionButton label="Use roll" onPress={() => apply({ manual: typed })} />
          </View>
          {error && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
        </>
      )}
    </ThemedView>
  );
}

export default function CoachScreen() {
  const { slot: rawSlot } = useLocalSearchParams<{ slot: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { league, draft, setCoach } = useLeagueDraft();
  const slot = parseSlot(rawSlot, league.size);
  const team = slot === null ? null : draft.teams[slot];
  const stepHref = `/league/${league.id}/new/coaches` as const;
  const leave = () => (router.canGoBack() ? router.back() : router.replace(stepHref));

  if (slot === null || !team) {
    return (
      <Screen>
        <ThemedText type="subtitle">Team not found</ThemedText>
        <ActionButton label="Back to coaches" onPress={() => router.replace(stepHref)} />
      </Screen>
    );
  }

  const coach = team.coach;
  const allNames = draft.teams.map((candidate) => candidate?.coach?.name ?? '');
  const otherNames = allNames.filter((_, index) => index !== slot);
  const nameProblem = coach ? coachNameProblem(coach, allNames, slot) : null;

  if (!coach) {
    return (
      <Screen>
        <ThemedText type="subtitle">Coach for {team.location} {team.name}</ThemedText>
        <ThemedText themeColor="textSecondary">This team has no coach yet.</ThemedText>
        <ActionButton label="Roll this coach" variant="primary" onPress={() => setCoach(slot, rollWholeCoach(pickCoachName(otherNames) ?? ''))} />
        <ActionButton label="Back" onPress={leave} />
      </Screen>
    );
  }

  const run = (step: (draft: CoachDraft, options: RollOptions) => Applied) => (options: RollOptions) => {
    const result = step(coach, options);
    if (result.ok) setCoach(slot, result.draft);
    return result;
  };

  return (
    <Screen>
      <ThemedText type="subtitle">Coach for {team.location} {team.name}</ThemedText>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Name</ThemedText>
          <TextInput
            accessibilityLabel="Coach name"
            value={coach.name}
            onChangeText={(name) => setCoach(slot, { ...coach, name })}
            maxLength={MAX_COACH_NAME_LENGTH + 10}
            autoCapitalize="words"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          {nameProblem && (
            <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{nameProblem}</ThemedText>
          )}
          <ActionButton
            label="Draw another name"
            onPress={() => {
              const name = pickCoachName(otherNames);
              if (name) setCoach(slot, { ...coach, name });
            }}
          />
        </View>

        <RollRow label="Age" shown={rolled(coach.age, coach.age ? String(coach.age.outcome) : null)} onRoll={run(rollCoachAge)} />
        <RollRow
          label="Focus"
          shown={rolled(coach.focus, coach.focus?.outcome ? FOCUS_LABELS[coach.focus.outcome] : null)}
          onRoll={run(rollCoachFocus)}
        />
        <RollRow
          label="Specialty"
          shown={rolled(coach.specialty, coach.specialty?.outcome ? SPECIALTY_INFO[coach.specialty.outcome].label : null)}
          disabledReason={coach.focus ? undefined : 'Roll the focus first.'}
          onRoll={run(rollCoachSpecialty)}
        />
        {coach.specialty?.outcome && (
          <ThemedText type="small" themeColor="textSecondary">{SPECIALTY_INFO[coach.specialty.outcome].effect}</ThemedText>
        )}
        {!coach.specialty && coach.focus && (
          <ThemedText type="small" accessibilityRole="alert" themeColor="textSecondary">The focus changed, so roll the specialty again.</ThemedText>
        )}
        <RollRow
          label="Game day quality"
          shown={rolled(coach.gameDay, coach.gameDay?.outcome ? GAME_DAY_LABELS[coach.gameDay.outcome] : null)}
          onRoll={run(rollCoachGameDay)}
        />
        <ActionButton label="Done" variant="primary" onPress={leave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
  field: { gap: Spacing.two },
  rollRow: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  typedRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: { minHeight: 44, minWidth: 120, flexShrink: 1, paddingHorizontal: Spacing.three, borderRadius: Spacing.three, fontSize: 16 },
  error: { color: ErrorTextColor },
});
