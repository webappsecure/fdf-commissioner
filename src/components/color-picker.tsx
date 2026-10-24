import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ErrorTextColor, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { colorGrid, PALETTE, parseHexColor } from '@/leagues/team-input';

import { ActionButton } from './action-button';
import { ColorSwatch } from './color-swatch';
import { ThemedText } from './themed-text';

const GRID = colorGrid();

type ColorPickerProps = {
  label: string;
  /** Raw text: a grid color or whatever the commissioner typed. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export function ColorPicker({ label, value, onChange, error }: ColorPickerProps) {
  const theme = useTheme();
  const parsed = parseHexColor(value);
  const [gridOpen, setGridOpen] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel={`${label} quick colors`}>
        {PALETTE.map((color) => {
          const selected = parsed === color.hex;
          return (
            <Pressable
              key={color.hex}
              accessibilityRole="radio"
              accessibilityLabel={`${label} ${color.name}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(color.hex)}
              style={[styles.target, selected && { borderColor: theme.text, borderWidth: 3 }]}>
              <ColorSwatch color={color.hex} size={28} />
            </Pressable>
          );
        })}
      </View>
      <ActionButton label={gridOpen ? 'Hide color grid' : 'Show color grid'} onPress={() => setGridOpen((open) => !open)} />
      {gridOpen && (
        <View accessibilityRole="radiogroup" accessibilityLabel={`${label} color grid`} style={styles.grid}>
          {GRID.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((hex) => {
                const selected = parsed === hex;
                return (
                  <Pressable
                    key={hex}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} ${hex}`}
                    accessibilityState={{ selected }}
                    onPress={() => onChange(hex)}
                    style={[styles.cell, { backgroundColor: hex }, selected && { borderColor: theme.text, borderWidth: 3 }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      )}
      <View style={styles.custom}>
        <TextInput
          accessibilityLabel={`${label} custom hex value`}
          placeholder="#RRGGBB"
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={9}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        {parsed && <ColorSwatch color={parsed} size={32} />}
      </View>
      {error && <ThemedText type="small" accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: 'transparent' },
  grid: { gap: 2 },
  gridRow: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, height: 40, borderRadius: 4, borderWidth: 1, borderColor: '#80808080' },
  custom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { minHeight: 44, minWidth: 140, paddingHorizontal: Spacing.three, borderRadius: Spacing.three, fontSize: 16 },
  error: { color: ErrorTextColor },
});
