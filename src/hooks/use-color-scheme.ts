import { useThemePreference } from '@/theme/theme-preference';

export function useColorScheme() {
  return useThemePreference().scheme;
}
