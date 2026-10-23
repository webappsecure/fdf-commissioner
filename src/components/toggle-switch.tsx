import { Pressable, StyleSheet, View } from 'react-native';

type ToggleSwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const OFF = '#80868B';
const ON = '#2E7D32';

// Drawn by hand because the native Switch ignores custom track colors on iOS, leaving it nearly invisible.
export function ToggleSwitch({ label, value, onValueChange }: ToggleSwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.track, { backgroundColor: value ? ON : OFF }]}>
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 56, height: 32, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 3 },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ffffff' },
  thumbOn: { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
});
