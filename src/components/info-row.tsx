import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText>{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.three, borderRadius: Spacing.three },
});
