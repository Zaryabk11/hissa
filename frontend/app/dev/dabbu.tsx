import { useState } from 'react';
import { View } from 'react-native';
import { HissaThemeProvider } from '../../src/shared/theme/HissaThemeProvider';
import { dhoop, raat, type HissaTheme } from '../../src/shared/theme/hissaTokens';
import { Card } from '../../src/shared/ui/hissa/Card';
import { Dabbu, DABBU_MOODS } from '../../src/shared/ui/hissa/Dabbu';
import { HissaRoot } from '../../src/shared/ui/hissa/HissaRoot';
import { HissaScreen } from '../../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../../src/shared/ui/hissa/HissaText';
import { IrisProvider } from '../../src/shared/ui/hissa/IrisTransition';
import { Panel } from '../../src/shared/ui/hissa/Panel';
import { PrimaryButton } from '../../src/shared/ui/hissa/PrimaryButton';
import { SecondaryButton } from '../../src/shared/ui/hissa/SecondaryButton';
import { Segmented } from '../../src/shared/ui/hissa/Segmented';
import { Sheet } from '../../src/shared/ui/hissa/Sheet';
import { SpeechBubble } from '../../src/shared/ui/hissa/SpeechBubble';
import { Toast } from '../../src/shared/ui/hissa/Toast';
import { Wordmark } from '../../src/shared/ui/hissa/Wordmark';

function Demo({ theme }: { theme: HissaTheme }) {
  const [seg, setSeg] = useState<'day' | 'week'>('day');
  const [sheet, setSheet] = useState(false);
  const [kick, setKick] = useState(0);
  return (
    <HissaThemeProvider theme={theme}>
      <HissaScreen>
        <HissaText variant="title">{theme.name}</HissaText>
        <Wordmark />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 }}>
          {DABBU_MOODS.map((m) => (
            <View key={m} style={{ alignItems: 'center' }}>
              <Dabbu mood={m} size={80} kick={kick} />
              <HissaText variant="caption">{m}</HissaText>
            </View>
          ))}
          <Dabbu mood="wave" tone="cloud" size={80} />
        </View>
        <View style={{ gap: 12 }}>
          <SpeechBubble>Consistency beats perfection.</SpeechBubble>
          <Card>
            <HissaText variant="label">Card</HissaText>
          </Card>
          <PrimaryButton label="Get Hissa" onPress={() => setKick((k) => k + 1)} />
          <SecondaryButton label="Open sheet" onPress={() => setSheet(true)} />
          <Segmented options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]} value={seg} onChange={setSeg} />
          <Panel>
            <HissaText variant="body">Panel</HissaText>
          </Panel>
        </View>
        <Sheet visible={sheet} onClose={() => setSheet(false)} title="Sheet">
          <PrimaryButton label="Done" onPress={() => setSheet(false)} />
        </Sheet>
        <Toast message="Meal removed" onAction={() => setKick((k) => k + 1)} />
      </HissaScreen>
    </HissaThemeProvider>
  );
}

/** Dev-only gallery of the shared UI in both themes. */
export default function DevDabbu() {
  if (!__DEV__) return null;
  return (
    <HissaRoot>
      <IrisProvider>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Demo theme={dhoop} />
          </View>
          <View style={{ flex: 1 }}>
            <Demo theme={raat} />
          </View>
        </View>
      </IrisProvider>
    </HissaRoot>
  );
}
