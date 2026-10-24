import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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

const styles = StyleSheet.create({
  choice: { minHeight: 44, minWidth: 44, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center', borderRadius: Spacing.three },
});
