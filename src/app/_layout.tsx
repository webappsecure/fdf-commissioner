import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DatabaseProvider } from '@/db/database-provider';
import { setUpServiceWorker } from '@/pwa/service-worker';
import { ThemePreferenceProvider } from '@/theme/theme-preference';

function ThemedApp() {
  const scheme = useColorScheme();
  useEffect(setUpServiceWorker, []);
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <DatabaseProvider>
        <AppTabs />
      </DatabaseProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedApp />
    </ThemePreferenceProvider>
  );
}
