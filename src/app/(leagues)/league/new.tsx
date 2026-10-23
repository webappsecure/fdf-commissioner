import { useRouter } from 'expo-router';

import { LeagueForm } from '@/components/league-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { createLeague } from '@/db/leagues';

export default function NewLeagueScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ThemedText type="subtitle">New league</ThemedText>
      <LeagueForm
        mode="create"
        initial={{ name: '', size: 12, structure: 'flat', weeklyHeadlineEnabled: false }}
        submitLabel="Create league"
        onSubmit={async (values) => {
          const id = await createLeague(values);
          router.replace(`/league/${id}`);
        }}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </Screen>
  );
}
