import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../shared/theme';
import { getDueCheckin, submitCheckin, type DueCheckin } from '../api/feel';
import {
  canSubmit,
  needsSymptomDetail,
  type Energy,
  type Stomach,
  type Symptom,
} from '../feel-view';

const ENERGY: Energy[] = ['low', 'okay', 'good'];
const STOMACH: Stomach[] = ['heavy', 'fine', 'light'];
const SYMPTOMS: { id: Symptom; label: string }[] = [
  { id: 'bloated', label: 'bloated' },
  { id: 'upset', label: 'upset' },
  { id: 'other', label: 'other' },
  { id: 'not_sure', label: 'not sure' },
];

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text style={[styles.choiceText, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

export function CheckinPanel() {
  const [due, setDue] = useState<DueCheckin | undefined>(undefined);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [stomach, setStomach] = useState<Stomach | null>(null);
  const [symptom, setSymptom] = useState<Symptom | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string | null>(null); // meal id skipped on this screen

  const load = useCallback(async () => {
    try {
      setDue(await getDueCheckin());
    } catch {
      setMessage('Could not load your check-in.');
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function save() {
    if (!due || !energy || !stomach) return;
    try {
      await submitCheckin({
        mealId: due.mealId,
        energy,
        stomach,
        ...(needsSymptomDetail(stomach) && symptom ? { symptom } : {}),
      });
      setEnergy(null);
      setStomach(null);
      setSymptom(undefined);
      setMessage('Thanks. Saved.');
      await load();
    } catch {
      setMessage('Could not save. This meal may not be due for a check-in.');
    }
  }

  if (due === undefined) return <Text style={styles.text}>{message ?? 'Loading…'}</Text>;
  if (due === null || due.mealId === skipped)
    return <Text style={styles.text}>{message ?? 'Nothing to check in on right now.'}</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.text}>How did this meal sit? {due.dishes.join(', ')}</Text>
      <Text style={styles.label}>Energy</Text>
      <View style={styles.row}>
        {ENERGY.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={energy === value}
            onPress={() => setEnergy(value)}
          />
        ))}
      </View>
      <Text style={styles.label}>Stomach</Text>
      <View style={styles.row}>
        {STOMACH.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={stomach === value}
            onPress={() => setStomach(value)}
          />
        ))}
      </View>
      {needsSymptomDetail(stomach) ? (
        <>
          <Text style={styles.label}>Anything specific? (optional)</Text>
          <View style={styles.row}>
            {SYMPTOMS.map(({ id, label }) => (
              <Choice
                key={id}
                label={label}
                selected={symptom === id}
                onPress={() => setSymptom(id)}
              />
            ))}
          </View>
        </>
      ) : null}
      <View style={styles.row}>
        <Choice
          label="Save"
          selected={false}
          onPress={() => canSubmit(energy, stomach) && void save()}
        />
        <Choice label="Skip" selected={false} onPress={() => setSkipped(due.mealId)} />
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  text: { color: theme.colors.text, fontSize: 16 },
  label: { color: theme.colors.muted, fontSize: 14 },
  message: { color: theme.colors.muted },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.muted,
  },
  selected: { backgroundColor: theme.colors.text },
  choiceText: { color: theme.colors.text },
  selectedText: { color: theme.colors.background },
});
