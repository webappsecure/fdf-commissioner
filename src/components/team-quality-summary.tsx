import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { describeTeamQualities, summarizeSpecialTeams } from '@/leagues/roster-text';
import type { TeamEvaluation } from '@/rules/team-qualities';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

/** Offense and defense team qualities side by side, from guide section 5. */
export function TeamQualitySummary({ evaluation, specialTeams }: { evaluation: TeamEvaluation; specialTeams: ReturnType<typeof summarizeSpecialTeams> }) {
  const { offense, defense } = evaluation;
  const tendency = offense.tendency === 'neutral' ? 'Neutral' : offense.tendency;
  return (
    <View style={styles.cards}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" accessibilityRole="header">Offense</ThemedText>
        <Row label="Tendency" value={tendency} />
        <Row label="Pass / run total" value={`${offense.pass} / ${offense.run}`} />
        <Row label="Qualities" value={describeTeamQualities(offense.scoring, offense.qualities)} />
      </ThemedView>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" accessibilityRole="header">Defense</ThemedText>
        <Row label="Qualities" value={describeTeamQualities(defense.prevention, defense.qualities)} />
      </ThemedView>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold" accessibilityRole="header">Special teams</ThemedText>
        <View style={styles.columns}>
          {specialTeams.map((group) => (
            <View key={group.title} style={styles.column}>
              <ThemedText type="smallBold">{group.title}</ThemedText>
              {group.rows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} />
              ))}
            </View>
          ))}
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: 280, gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  column: { flexGrow: 1, flexBasis: 120, gap: Spacing.two },
  row: { gap: 2 },
});
