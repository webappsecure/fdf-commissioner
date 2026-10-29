import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { describePlayer, PLAYER_UNITS, unitOf, type PlayerLine } from '@/leagues/roster-text';

import { ThemedText } from './themed-text';

/** A roster as one line per player under Offense, Defense and Special teams headings. */
export function PlayerRows({ players }: { players: PlayerLine[] }) {
  return (
    <View style={styles.rows}>
      <ThemedText type="small" themeColor="textSecondary">
        Each line: slot, name, age, rating (pass/run) or grade, qualities.
      </ThemedText>
      {PLAYER_UNITS.map((unit) => (
        <View key={unit} style={styles.unit}>
          <ThemedText type="smallBold" accessibilityRole="header">{unit}</ThemedText>
          {players
            .filter((player) => unitOf(player.position) === unit)
            .map((player) => (
              <View key={player.slot} style={styles.line} accessible accessibilityLabel={`${player.slot} ${player.name} ${describePlayer(player)}`}>
                <ThemedText type="smallBold" style={styles.slot}>{player.slot}</ThemedText>
                <ThemedText type="small" style={styles.text}>
                  {player.name}  {describePlayer(player)}
                </ThemedText>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: Spacing.three },
  unit: { gap: Spacing.one },
  line: { flexDirection: 'row', gap: Spacing.two, minHeight: 24, alignItems: 'flex-start' },
  slot: { width: 44 },
  text: { flex: 1 },
});
