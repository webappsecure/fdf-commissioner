import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActionButton } from '@/components/action-button';
import { LeagueForm } from '@/components/league-form';
import { LeagueNotFound } from '@/components/league-not-found';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { updateLeague } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';

export default function EditLeagueScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseLeagueId(rawId);
  const { state } = useLeague(id);

  if (state.status === 'missing') {
    return (
      <Screen>
        <LeagueNotFound />
      </Screen>
    );
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading league...</ThemedText>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <ThemedText accessibilityRole="alert">The league could not be loaded.</ThemedText>
        <ActionButton label="Back to leagues" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const { league } = state;

  // A direct load or reload has no history to go back to.
  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace(`/league/${league.id}`);
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Edit league</ThemedText>
      <LeagueForm
        mode="edit"
        initial={{
          name: league.name,
          size: league.size,
          structure: league.structure,
          weeklyHeadlineEnabled: league.weeklyHeadlineEnabled,
        }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateLeague(league.id, values);
          leave();
        }}
        onCancel={leave}
      />
    </Screen>
  );
}
