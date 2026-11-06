import { useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { MIN_TAP } from '../../shared/theme/hissaTokens';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { Dabbu, type DabbuMood } from '../../shared/ui/hissa/Dabbu';
import { ProgressDots } from '../../shared/ui/hissa/ProgressDots';
import { SpeechBubble } from '../../shared/ui/hissa/SpeechBubble';
import { backFallback } from './backTarget';
import { onboardingContent as c, TOTAL_STEPS } from './content';

/** Back button, progress bars, then "Step n of 5". Back goes one screen back, or, with no history, to the landing (web) or the index redirector (app). */
export function StepHeader({ step }: { step: number }) {
  const t = useHissaTheme();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace(backFallback(Platform.OS)));
  const say = c.says[step - 1];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.back}
          onPress={back}
          hitSlop={4}
          style={{ width: MIN_TAP, height: MIN_TAP, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 5l-7 7 7 7" />
          </Svg>
        </Pressable>
        <ProgressDots step={step} total={TOTAL_STEPS} />
      </View>
      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Dabbu mood={say.mood as DabbuMood} size={72} />
        <SpeechBubble>{say.text}</SpeechBubble>
      </View>
      <HissaText variant="eyebrow" style={{ marginTop: 20 }}>
        {c.step(step)}
      </HissaText>
    </View>
  );
}
