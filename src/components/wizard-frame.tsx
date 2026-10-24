import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ActionButton } from './action-button';
import { useLeagueDraft } from './league-draft-provider';
import { Screen } from './screen';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const STEPS = ['Teams', 'Alignment', 'Coaches', 'Review'];

type WizardFrameProps = {
  /** 1 to 4. */
  step: number;
  children: ReactNode;
  backHref?: Href;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  /** Shown instead of the content when an earlier step is unfinished. */
  blocked?: { message: string; href: Href };
};

export function WizardFrame({ step, children, backHref, nextLabel = 'Next', onNext, nextDisabled, blocked }: WizardFrameProps) {
  const router = useRouter();
  const { league, dirty } = useLeagueDraft();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const home = `/league/${league.id}` as const;

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (backHref) router.replace(backHref);
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{league.name}</ThemedText>
      <ThemedText type="smallBold" accessibilityLabel={`Step ${step} of ${STEPS.length}: ${STEPS[step - 1]}`}>
        {STEPS.map((label, index) => `${index + 1}. ${label}`).join('   ')}
      </ThemedText>
      <View style={styles.dots}>
        {STEPS.map((label, index) => (
          <ThemedView key={label} type={index < step ? 'backgroundSelected' : 'backgroundElement'} style={[styles.dot, index + 1 === step && styles.current]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {blocked ? (
          <>
            <ThemedText themeColor="textSecondary">{blocked.message}</ThemedText>
            <ActionButton label="Go to that step" onPress={() => router.replace(blocked.href)} />
          </>
        ) : (
          children
        )}

        {confirmingCancel ? (
          <ThemedView type="backgroundElement" style={styles.confirm}>
            <ThemedText type="smallBold">Discard this setup?</ThemedText>
            <ThemedText themeColor="textSecondary">The teams you entered are not saved yet and will be lost.</ThemedText>
            <ActionButton label="Discard and leave" variant="danger" onPress={() => router.replace(home)} />
            <ActionButton label="Keep editing" onPress={() => setConfirmingCancel(false)} />
          </ThemedView>
        ) : (
          <View style={styles.actions}>
            {!blocked && onNext && <ActionButton label={nextLabel} variant="primary" disabled={nextDisabled} onPress={onNext} />}
            {(backHref || step > 1) && <ActionButton label="Back" onPress={goBack} />}
            <ActionButton label="Cancel" onPress={() => (dirty ? setConfirmingCancel(true) : router.replace(home))} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: Spacing.two },
  dot: { flex: 1, height: 6, borderRadius: 3 },
  current: { height: 8 },
  content: { gap: Spacing.three, paddingBottom: Spacing.four },
  actions: { gap: Spacing.two },
  confirm: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.three },
});
