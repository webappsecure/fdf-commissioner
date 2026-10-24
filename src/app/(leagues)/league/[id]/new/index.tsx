import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ColorSwatch } from '@/components/color-swatch';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardFrame } from '@/components/wizard-frame';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hasDuplicateGroupName, MAX_GROUP_NAME_LENGTH, validateGroupName } from '@/leagues/team-input';

function groupNameError(names: string[], index: number) {
  const checked = validateGroupName(names[index]);
  if (!checked.ok) return checked.error === 'empty' ? 'Enter a name.' : `Use ${MAX_GROUP_NAME_LENGTH} characters or fewer.`;
  if (hasDuplicateGroupName(names, names[index], index)) return 'Another one already uses this name.';
  return null;
}

function GroupNameInput({ label, kind, index }: { label: string; kind: 'conference' | 'division'; index: number }) {
  const theme = useTheme();
  const { draft, setGroupName } = useLeagueDraft();
  const names = kind === 'conference' ? draft.conferenceNames : draft.divisionNames;
  const error = groupNameError(names, index);

  return (
    <View style={styles.groupName}>
      <TextInput
        accessibilityLabel={label}
        value={names[index]}
        onChangeText={(name) => setGroupName(kind, index, name)}
        maxLength={MAX_GROUP_NAME_LENGTH + 10}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      {error && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

export default function TeamsStep() {
  const router = useRouter();
  const { league, layout, draft } = useLeagueDraft();
  const base = `/league/${league.id}/new` as const;
  const groupsValid =
    draft.conferenceNames.every((_, index) => !groupNameError(draft.conferenceNames, index)) &&
    draft.divisionNames.every((_, index) => !groupNameError(draft.divisionNames, index));
  const filled = draft.teams.filter((team) => team !== null).length;

  const firstSlots = layout.groups.map((_, index) => layout.groups.slice(0, index).reduce((sum, group) => sum + group.teamCount, 0));
  return (
    <WizardFrame
      step={1}
      nextDisabled={filled < draft.teams.length || !groupsValid}
      onNext={() => router.push(`${base}/alignment`)}>
      <ThemedText themeColor="textSecondary">
        {filled} of {draft.teams.length} teams entered. Tap a slot to enter a team.
      </ThemedText>

      {layout.groups.map((group, groupIndex) => {
        const first = firstSlots[groupIndex];
        const startsConference = group.conferenceIndex !== null && group.divisionIndex === group.conferenceIndex * 2 - 1;
        return (
          <View key={first} style={styles.group}>
            {startsConference && (
              <GroupNameInput label={`Conference ${group.conferenceIndex} name`} kind="conference" index={group.conferenceIndex! - 1} />
            )}
            {group.divisionIndex !== null && (
              <GroupNameInput label={`Division ${group.divisionIndex} name`} kind="division" index={group.divisionIndex - 1} />
            )}
            {Array.from({ length: group.teamCount }, (_, offset) => {
              const index = first + offset;
              const team = draft.teams[index];
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={team ? `Edit team ${index + 1}: ${team.location} ${team.name}` : `Enter team ${index + 1}`}
                  onPress={() => router.push(`${base}/team/${index}`)}>
                  <ThemedView type="backgroundElement" style={styles.slot}>
                    {team ? (
                      <>
                        <ColorSwatch color={team.primaryColor} />
                        <ColorSwatch color={team.secondaryColor} />
                        <ThemedText style={styles.slotText}>
                          {team.location} {team.name}
                        </ThemedText>
                      </>
                    ) : (
                      <ThemedText themeColor="textSecondary">Team {index + 1}: not entered</ThemedText>
                    )}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  groupName: { gap: Spacing.one },
  input: { minHeight: 44, paddingHorizontal: Spacing.three, borderRadius: Spacing.three, fontSize: 16, fontWeight: '700' },
  slot: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.three },
  slotText: { flex: 1 },
  error: { color: ErrorTextColor },
});
