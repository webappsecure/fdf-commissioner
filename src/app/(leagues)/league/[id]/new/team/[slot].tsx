import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ColorPicker } from '@/components/color-picker';
import { useLeagueDraft } from '@/components/league-draft-provider';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ErrorTextColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hasDuplicateTeam, MAX_TEAM_TEXT_LENGTH, parseHexColor, validateTeamText } from '@/leagues/team-input';
import { parseSlot } from '@/leagues/team-layout';

type Errors = Partial<Record<'location' | 'name' | 'primary' | 'secondary' | 'form', string>>;

function textError(error: 'empty' | 'too-long') {
  return error === 'empty' ? 'Enter a value.' : `Use ${MAX_TEAM_TEXT_LENGTH} characters or fewer.`;
}

export default function TeamForm() {
  const { slot: rawSlot } = useLocalSearchParams<{ slot: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { league, draft, setTeam } = useLeagueDraft();
  const slot = parseSlot(rawSlot, league.size);
  const existing = slot === null ? null : draft.teams[slot];
  const locationInput = useRef<ComponentRef<typeof TextInput>>(null);
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [location, setLocation] = useState(existing?.location ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [primary, setPrimary] = useState(existing?.primaryColor ?? '');
  const [secondary, setSecondary] = useState(existing?.secondaryColor ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const stepHref = `/league/${league.id}/new` as const;
  const leave = () => (router.canGoBack() ? router.back() : router.replace(stepHref));
  if (slot === null) {
    return (
      <Screen>
        <ThemedText type="subtitle">Team not found</ThemedText>
        <ActionButton label="Back to teams" onPress={() => router.replace(stepHref)} />
      </Screen>
    );
  }

  function save() {
    if (slot === null) return;
    const next: Errors = {};
    const checkedLocation = validateTeamText(location);
    const checkedName = validateTeamText(name);
    if (!checkedLocation.ok) next.location = textError(checkedLocation.error);
    if (!checkedName.ok) next.name = textError(checkedName.error);
    const primaryHex = parseHexColor(primary);
    const secondaryHex = parseHexColor(secondary);
    if (!primaryHex) next.primary = 'Pick a color or enter a hex value like #1565C0.';
    if (!secondaryHex) next.secondary = 'Pick a color or enter a hex value like #FFFFFF.';
    if (primaryHex && primaryHex === secondaryHex) next.secondary = 'The two colors must be different.';
    if (checkedLocation.ok && checkedName.ok && hasDuplicateTeam(draft.teams, { location: checkedLocation.value, name: checkedName.value }, slot)) {
      next.name = 'Another team already has this location and name.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.location) locationInput.current?.focus();
      else if (next.name) nameInput.current?.focus();
      return;
    }
    setTeam(slot, {
      location: checkedLocation.ok ? checkedLocation.value : '',
      name: checkedName.ok ? checkedName.value : '',
      primaryColor: primaryHex!,
      secondaryColor: secondaryHex!,
      coach: null,
    });
    leave();
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Team {slot + 1}</ThemedText>
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.field}>
          <ThemedText type="smallBold">Location</ThemedText>
          <TextInput
            ref={locationInput}
            accessibilityLabel="Location"
            value={location}
            onChangeText={setLocation}
            maxLength={MAX_TEAM_TEXT_LENGTH + 10}
            autoCapitalize="words"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          {errors.location && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{errors.location}</ThemedText>}
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">Team name</ThemedText>
          <TextInput
            ref={nameInput}
            accessibilityLabel="Team name"
            value={name}
            onChangeText={setName}
            maxLength={MAX_TEAM_TEXT_LENGTH + 10}
            autoCapitalize="words"
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
          {errors.name && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{errors.name}</ThemedText>}
        </View>
        <ColorPicker label="Primary color" value={primary} onChange={setPrimary} error={errors.primary} />
        <ColorPicker label="Secondary color" value={secondary} onChange={setSecondary} error={errors.secondary} />
        <View style={styles.field}>
          <ActionButton label="Save team" variant="primary" onPress={save} />
          <ActionButton label="Cancel" onPress={leave} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, paddingBottom: Spacing.four },
  field: { gap: Spacing.two },
  input: { minHeight: 44, paddingHorizontal: Spacing.three, borderRadius: Spacing.three, fontSize: 16 },
  error: { color: ErrorTextColor },
});
