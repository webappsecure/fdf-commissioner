import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedView } from './themed-view';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>{children}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  content: {
    flex: 1,
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
