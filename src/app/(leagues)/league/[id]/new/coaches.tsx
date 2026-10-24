import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardFrame } from '@/components/wizard-frame';
import { Spacing } from '@/constants/theme';
import { coachProblem, describeDraftCoach, rollWholeCoach, type CoachDraft } from '@/leagues/coach-draft';
import { pickCoachName } from '@/leagues/coach-names';

export default function CoachesStep() {
  const router = useRouter();
  const { league, draft, setCoaches } = useLeagueDraft();
  const base = `/league/${league.id}/new` as const;
  const aligned = draft.teams.every((team) => team?.alignment);
  const coachNames = draft.teams.map((team) => team?.coach?.name ?? '');
  const allReady = draft.teams.every((team, index) => team?.coach && !coachProblem(team.coach, coachNames, index));
  const anyRolled = draft.teams.some((team) => team?.coach);

  function rollAll() {
    const used: string[] = [];
    const coaches: CoachDraft[] = draft.teams.map(() => {
      const name = pickCoachName(used) ?? '';
      used.push(name);
      return rollWholeCoach(name);
    });
    setCoaches(coaches);
  }

  return (
    <WizardFrame
      step={3}
      backHref={`${base}/alignment`}
      blocked={aligned ? undefined : { message: "Set every team's alignment first.", href: `${base}/alignment` }}
      nextDisabled={!allReady}
      onNext={() => router.push(`${base}/review`)}>
      <ThemedText themeColor="textSecondary">
        Each team gets a head coach. Names come from the coach name list; age, focus, specialty and game day quality are rolled with the guide&apos;s tables. Open a coach to re-roll or type a roll.
      </ThemedText>
      <ActionButton label={anyRolled ? 'Roll all coaches again' : 'Roll all coaches'} onPress={rollAll} />

      {draft.teams.map((team, index) => {
        if (!team) return null;
        const problem = team.coach ? coachProblem(team.coach, coachNames, index) : null;
        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Coach for ${team.location} ${team.name}`}
            onPress={() => router.push(`${base}/coach/${index}`)}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="smallBold">
                {team.location} {team.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{team.coach ? `${team.coach.name || 'No name'}: ${describeDraftCoach(team.coach)}` : 'No coach yet'}</ThemedText>
              {problem && <ThemedText type="small" themeColor="textSecondary">{problem}</ThemedText>}
            </ThemedView>
          </Pressable>
        );
      })}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three, minHeight: 44 },
});
