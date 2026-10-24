import { StyleSheet, View } from 'react-native';

export function ColorSwatch({ color, size = 20 }: { color: string; size?: number }) {
  return <View style={[styles.swatch, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]} />;
}

const styles = StyleSheet.create({
  swatch: { borderWidth: 1, borderColor: '#80808080' },
});
