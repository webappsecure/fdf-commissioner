import { Pressable, StyleSheet } from 'react-native';

import { DangerFillColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function ActionButton({ label, onPress, variant = 'secondary', disabled = false }: ActionButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.text : variant === 'danger' ? DangerFillColor : theme.backgroundElement;
  const color = variant === 'primary' ? theme.background : variant === 'danger' ? '#ffffff' : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: background }, (pressed || disabled) && styles.dimmed]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  dimmed: { opacity: 0.6 },
});
