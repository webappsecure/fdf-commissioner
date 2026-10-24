import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { incrementLaunchCount, openStage } from '@/db/database';

type State =
  | { status: 'loading' }
  | { status: 'ready'; launchCount: number }
  | { status: 'error'; detail: string };

const OPEN_TIMEOUT_MS = 15000;

const LaunchCountContext = createContext(0);

export function useLaunchCount() {
  return use(LaunchCountContext);
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setState((current) =>
          current.status === 'loading'
            ? { status: 'error', detail: `Timed out while: ${openStage}.` }
            : current,
        ),
      OPEN_TIMEOUT_MS,
    );
    incrementLaunchCount()
      .then((launchCount) => setState({ status: 'ready', launchCount }))
      .catch((error: unknown) =>
        setState({ status: 'error', detail: error instanceof Error ? error.message : String(error) }),
      )
      .finally(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, []);

  if (state.status === 'ready') {
    return <LaunchCountContext value={state.launchCount}>{children}</LaunchCountContext>;
  }

  return (
    <ThemedView style={styles.center}>
      <ThemedText type="subtitle">
        {state.status === 'error' ? 'Could not open local storage' : 'Loading'}
      </ThemedText>
      {state.status === 'error' && (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          The app cannot run without its local database. Close and reopen the app.
        </ThemedText>
      )}
      {state.status === 'error' && (
        <ThemedText type="code" themeColor="textSecondary" style={styles.message}>
          {state.detail}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  message: { textAlign: 'center', maxWidth: 400 },
});
