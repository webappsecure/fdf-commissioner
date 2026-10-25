import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { getMeta, setMeta } from '@/db/database';
import { parsePreference, type ThemePreference } from '@/theme/preference';

export type { ThemePreference };

type ThemePreferenceValue = {
  preference: ThemePreference;
  scheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const THEME_KEY = 'theme_preference';

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
  preference: 'system',
  scheme: 'light',
  setPreference: () => {},
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    getMeta(THEME_KEY)
      .then((stored) => setPreferenceState(parsePreference(stored)))
      .catch(() => {});
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setMeta(THEME_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemePreferenceValue>(
    () => ({
      preference,
      scheme: preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference,
      setPreference,
    }),
    [preference, systemScheme, setPreference],
  );

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}

export function useThemePreference() {
  return use(ThemePreferenceContext);
}
