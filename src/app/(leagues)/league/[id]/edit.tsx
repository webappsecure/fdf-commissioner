import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ActionButton } from '@/components/action-button';
import { LeagueForm } from '@/components/league-form';
import { LeagueNotFound } from '@/components/league-not-found';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { getLeague, updateLeague, type League } from '@/db/leagues';
import { parseLeagueId } from '@/leagues/league-input';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'missing' } | { status: 'ready'; league: League };

export default function EditLeagueScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = parseLeagueId(rawId);
  const [state, setState] = useState<LoadState>(id === null ? { status: 'missing' } : { status: 'loading' });

  useEffect(() => {
    if (id === null) return;
    getLeague(id)
      .then((league) => setState(league ? { status: 'ready', league } : { status: 'missing' }))
      .catch(() => setState({ status: 'error' }));
  }, [id]);

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
          router.back();
        }}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
