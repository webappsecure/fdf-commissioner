import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/screen';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listLeagues, type League } from '@/db/leagues';
import { describeLeague } from '@/leagues/structures';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; leagues: League[] };

export default function LeaguesScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(() => {
    listLeagues()
      .then((leagues) => setState({ status: 'ready', leagues }))
      .catch(() => setState({ status: 'error' }));
  }, []);

  useFocusEffect(load);

  function retry() {
    setState({ status: 'loading' });
    load();
  }

  return (
    <Screen>
        <ThemedText type="subtitle">Leagues</ThemedText>

        {state.status === 'loading' && <ThemedText themeColor="textSecondary">Loading leagues...</ThemedText>}

        {state.status === 'error' && (
          <View style={styles.section}>
            <ThemedText accessibilityRole="alert">Leagues could not be loaded.</ThemedText>
            <ActionButton label="Try again" onPress={retry} />
          </View>
        )}

        {state.status === 'ready' && state.leagues.length === 0 && (
          <View style={styles.empty}>
            <ThemedText type="subtitle">No leagues yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.message}>
              Create your first league to get started.
            </ThemedText>
          </View>
        )}

        {state.status === 'ready' && state.leagues.length > 0 && (
          <ScrollView contentContainerStyle={styles.list}>
            {state.leagues.map((league) => (
              <Link key={league.id} href={`/league/${league.id}`} asChild>
                <Pressable accessibilityRole="link">
                  <ThemedView type="backgroundElement" style={styles.row}>
                    <ThemedText type="smallBold">{league.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {describeLeague(league.size, league.structure)}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        )}

        <ActionButton label="New league" variant="primary" onPress={() => router.push('/league/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  message: { textAlign: 'center' },
  list: { gap: Spacing.two },
  row: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
