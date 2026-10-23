import { Link } from 'expo-router';

import { ThemedText } from './themed-text';

export function LeagueNotFound() {
  return (
    <>
      <ThemedText type="subtitle">League not found</ThemedText>
      <ThemedText themeColor="textSecondary">This league does not exist or was deleted.</ThemedText>
      <Link href="/" replace>
        <ThemedText type="link">Back to leagues</ThemedText>
      </Link>
    </>
  );
}
