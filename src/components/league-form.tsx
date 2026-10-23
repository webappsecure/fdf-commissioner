import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { LeagueError, type LeagueErrorCode } from '@/db/leagues';
import { useTheme } from '@/hooks/use-theme';
import { MAX_LEAGUE_NAME_LENGTH, validateLeagueName } from '@/leagues/league-input';
import { describeLeague, LEAGUE_SIZES, structuresFor, type LeagueSize, type StructureId } from '@/leagues/structures';

import { ActionButton } from './action-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { ToggleSwitch } from './toggle-switch';

export type LeagueFormValues = {
  name: string;
  size: LeagueSize;
  structure: StructureId;
  weeklyHeadlineEnabled: boolean;
};

type LeagueFormProps = {
  mode: 'create' | 'edit';
  initial: LeagueFormValues;
  submitLabel: string;
  onSubmit: (values: LeagueFormValues) => Promise<void>;
  onCancel: () => void;
};

const NAME_ERRORS: Partial<Record<LeagueErrorCode, string>> = {
  'empty-name': 'Enter a name.',
  'name-too-long': `Use ${MAX_LEAGUE_NAME_LENGTH} characters or fewer.`,
  'duplicate-name': 'Another league already uses this name.',
};

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
      <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.choice}>
        <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function LeagueForm({ mode, initial, submitLabel, onSubmit, onCancel }: LeagueFormProps) {
  const theme = useTheme();
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [values, setValues] = useState(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function chooseSize(size: LeagueSize) {
    setValues((current) => ({ ...current, size, structure: structuresFor(size)[0].id }));
  }

  async function submit() {
    setFormError(null);
    const checked = validateLeagueName(values.name);
    if (!checked.ok) {
      setNameError(NAME_ERRORS[checked.error === 'empty' ? 'empty-name' : 'name-too-long'] ?? null);
      nameInput.current?.focus();
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      await onSubmit({ ...values, name: checked.name });
    } catch (error) {
      if (error instanceof LeagueError && NAME_ERRORS[error.code]) {
        setNameError(NAME_ERRORS[error.code] ?? null);
        nameInput.current?.focus();
      } else {
        setFormError('The league could not be saved. Try again.');
      }
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <ThemedText type="smallBold">League name</ThemedText>
        <TextInput
          ref={nameInput}
          accessibilityLabel="League name"
          value={values.name}
          onChangeText={(name) => setValues((current) => ({ ...current, name }))}
          maxLength={MAX_LEAGUE_NAME_LENGTH + 10}
          autoCapitalize="words"
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        {nameError && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{nameError}</ThemedText>}
      </View>

      {mode === 'create' ? (
        <>
          <View style={styles.field} accessibilityRole="radiogroup">
            <ThemedText type="smallBold">Teams</ThemedText>
            <View style={styles.choices}>
              {LEAGUE_SIZES.map((size) => (
                <Choice key={size} label={String(size)} selected={size === values.size} onPress={() => chooseSize(size)} />
              ))}
            </View>
          </View>
          <View style={styles.field} accessibilityRole="radiogroup">
            <ThemedText type="smallBold">Structure</ThemedText>
            <View style={styles.choices}>
              {structuresFor(values.size).map((option) => (
                <Choice
                  key={option.id}
                  label={option.label}
                  selected={option.id === values.structure}
                  onPress={() => setValues((current) => ({ ...current, structure: option.id }))}
                />
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.field}>
          <ThemedText type="smallBold">Size and structure</ThemedText>
          <ThemedText themeColor="textSecondary">{describeLeague(values.size, values.structure)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Fixed after creation.</ThemedText>
        </View>
      )}

      <View style={styles.switchRow}>
        <ThemedText>Weekly Headline</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.switchState}>
          {values.weeklyHeadlineEnabled ? 'On' : 'Off'}
        </ThemedText>
        <ToggleSwitch
          label="Weekly Headline"
          value={values.weeklyHeadlineEnabled}
          onValueChange={(weeklyHeadlineEnabled) => setValues((current) => ({ ...current, weeklyHeadlineEnabled }))}
        />
      </View>

      {formError && <ThemedText accessibilityRole="alert" style={styles.error}>{formError}</ThemedText>}

      <View style={styles.actions}>
        <ActionButton label={saving ? 'Saving...' : submitLabel} variant="primary" disabled={saving} onPress={submit} />
        <ActionButton label="Cancel" disabled={saving} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  field: { gap: Spacing.two },
  input: { minHeight: 44, paddingHorizontal: Spacing.three, borderRadius: Spacing.three, fontSize: 16 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: { minHeight: 44, minWidth: 44, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center', borderRadius: Spacing.three },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  switchState: { marginLeft: 'auto' },
  actions: { gap: Spacing.two },
  error: { color: '#D63A3A' },
});
