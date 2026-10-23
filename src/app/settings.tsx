import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useLaunchCount } from '@/db/database-provider';
import { requestStoragePersistence, type StorageStatus } from '@/db/storage-status';
import { useThemePreference, type ThemePreference } from '@/theme/theme-preference';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText>{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{value}</ThemedText>
    </ThemedView>
  );
}

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();
  const launchCount = useLaunchCount();
  const [storage, setStorage] = useState<StorageStatus | null>(null);

  useEffect(() => {
    requestStoragePersistence()
      .then(setStorage)
      .catch(() => setStorage('unsupported'));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <ThemedText type="subtitle">Settings</ThemedText>

        <View style={styles.section} accessibilityRole="radiogroup">
          <ThemedText type="smallBold">Appearance</ThemedText>
          <View style={styles.options}>
            {OPTIONS.map((option) => {
              const selected = option.value === preference;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setPreference(option.value)}
                  style={styles.option}>
                  <ThemedView
                    type={selected ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.optionView}>
                    <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                      {option.label}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">About</ThemedText>
          <Row label="Storage" value={storage ?? 'checking'} />
          <Row label="App launches" value={String(launchCount)} />
          <Row label="Version" value={Constants.expoConfig?.version ?? 'unknown'} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  content: {
    flex: 1,
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    padding: Spacing.four,
    paddingTop: TopTabInset + Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  section: { gap: Spacing.two },
  options: { flexDirection: 'row', gap: Spacing.two },
  option: { flex: 1 },
  optionView: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
