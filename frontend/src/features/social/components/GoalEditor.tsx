import { useState } from 'react';
import { View } from 'react-native';
import { Chip } from '../../../shared/ui/hissa/Choice';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { Card } from '../../feel/components/Card';
import type { GoalInput, GoalType } from '../api/goals';
import { socialContent as c } from '../content';
import { goalInput } from '../social-view';
import { TextField } from './TextField';

export function GoalEditor({ busy, onCreate }: { busy: boolean; onCreate: (input: GoalInput) => void }) {
  const [type, setType] = useState<GoalType>('streak');
  const [target, setTarget] = useState('');
  const [windowDays, setWindowDays] = useState('');
  const [shared, setShared] = useState(false); // sharing is off by default
  const [invalid, setInvalid] = useState(false);

  function save() {
    const input = goalInput(type, target, windowDays, shared);
    if (input) onCreate(input);
    else setInvalid(true);
  }

  return (
    <Card>
      <HissaText variant="label" accessibilityRole="header">
        {c.goal.new}
      </HissaText>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
        <Chip selected={type === 'streak'} label={c.goal.streakType} onPress={() => setType('streak')} />
        <Chip selected={type === 'window'} label={c.goal.windowType} onPress={() => setType('window')} />
      </View>
      <TextField accessibilityLabel={c.goal.target} keyboardType="number-pad" placeholder={c.goal.target} value={target} onChangeText={setTarget} />
      {type === 'window' && (
        <TextField accessibilityLabel={c.goal.windowDays} keyboardType="number-pad" placeholder={c.goal.windowDays} value={windowDays} onChangeText={setWindowDays} />
      )}
      <Pill variant={shared ? 'filled' : 'outline'} label={shared ? c.goal.shared : c.goal.shareToggle} onPress={() => setShared(!shared)} />
      {invalid && <HissaText accessibilityRole="alert">{c.goal.invalid}</HissaText>}
      <PrimaryButton disabled={busy} label={c.goal.save} onPress={save} />
    </Card>
  );
}
