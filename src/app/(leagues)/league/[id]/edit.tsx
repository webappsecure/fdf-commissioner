import { useLocalSearchParams, useRouter } from 'expo-router';

import { LeagueForm } from '@/components/league-form';
import { LeagueLoadGate } from '@/components/league-load-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { updateLeague, type League } from '@/db/leagues';
import { useLeague } from '@/hooks/use-league';
import { parseLeagueId } from '@/leagues/league-input';

function EditLeague({ league }: { league: League }) {
  const router = useRouter();

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

export default function EditLeagueScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useLeague(parseLeagueId(rawId));

  return (
    <LeagueLoadGate state={state} onRetry={retry}>
      {(league) => <EditLeague league={league} />}
    </LeagueLoadGate>
  );
}
