export type ThemePreference = 'system' | 'light' | 'dark';

export function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
