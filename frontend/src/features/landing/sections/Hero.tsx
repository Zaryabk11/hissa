import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  fluid,
  landingColors,
  landingFonts,
  landingType,
} from '../../../shared/theme/landingTokens';
import { HeroStage } from '../components/HeroStage';
import { LandingButton } from '../components/LandingButton';
import { content, type SectionId } from '../content';
import { openGetHissa } from '../getHissa';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useHeroIntro, type HeroIntro } from '../robot/HeroIntro';

const MIN_COL = 420;

const popIn = Easing.bezier(0.2, 1.5, 0.4, 1);
const settle = Easing.bezier(0.2, 0.8, 0.2, 1);

/** One headline word. Hidden until its punch lands, then slams in from the right with a small overshoot. */
function HeroWord({
  index,
  intro,
  style,
  children,
}: {
  index: number;
  intro: HeroIntro;
  style: object;
  children: string;
}) {
  const p = useDerivedValue(() =>
    withTiming(intro.words.value > index ? 1 : 0, { duration: 500, easing: popIn }),
  );
  const o = useDerivedValue(() => withTiming(intro.words.value > index ? 1 : 0, { duration: 120 }));
  const anim = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateX: 140 * (1 - p.value) },
      { scale: 1 + 0.3 * (1 - p.value) },
      { skewX: `${-10 * (1 - p.value)}deg` },
    ],
  }));
  return (
    <Animated.Text style={[style, { transformOrigin: 'right center' }, anim]}>
      {children}
    </Animated.Text>
  );
}

/** Subtext and buttons: fade up once the last punch is done. `delay` staggers the buttons after the text. */
function HeroFade({
  intro,
  delay = 0,
  children,
}: {
  intro: HeroIntro;
  delay?: number;
  children: ReactNode;
}) {
  const t = useDerivedValue(() =>
    withDelay(
      intro.done.value > 0 ? delay : 0,
      withTiming(intro.done.value > 0 ? 1 : 0, { duration: 800, easing: settle }),
    ),
  );
  const anim = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: 24 * (1 - t.value) }],
    pointerEvents: intro.done.value > 0 ? 'auto' : 'none',
  }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

type Props = { contentWidth: number; gutter: number; onNavigate: (id: SectionId) => void };

export function Hero({ contentWidth, gutter, onNavigate }: Props) {
  const { width } = useLandingLayout();
  const intro = useHeroIntro();
  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: intro.shakeX.value }, { translateY: intro.shakeY.value }],
  }));
  const gap = fluid(24, 4, 56, width);
  const twoCol = contentWidth >= MIN_COL * 2 + gap;
  // Seed with the expected column width so the stage paints on the first frame; onLayout then corrects it.
  const [stageW, setStageW] = useState(twoCol ? (contentWidth - gap) / 2 : contentWidth);
  const [stageReady, setStageReady] = useState(false);
  const h1 = fluid(landingType.heroH1.min, landingType.heroH1.vw, landingType.heroH1.max, width);
  const bodySize = fluid(17, 1.5, 19, width);
  const word = {
    fontFamily: landingFonts.display800,
    fontSize: h1,
    lineHeight: h1 * 0.9,
    letterSpacing: h1 * -0.045,
    textTransform: 'uppercase',
  } as const;

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 1120 + gutter * 2,
        alignSelf: 'center',
        paddingHorizontal: gutter,
        paddingTop: fluid(32, 6, 72, width),
        paddingBottom: fluid(56, 8, 96, width),
        flexDirection: twoCol ? 'row' : 'column',
        alignItems: twoCol ? 'center' : 'stretch',
        gap,
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          left: gutter,
          top: 20,
          fontFamily: landingFonts.body400,
          fontSize: 22,
          lineHeight: 22,
          color: '#fff',
        }}
      >
        +
      </Text>
      <Animated.View style={[{ flex: twoCol ? 1 : undefined }, shake]}>
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 32,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: landingColors.linePill,
            borderRadius: 99,
          }}
        >
          <View
            style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: landingColors.lime }}
          />
          <Text
            style={{
              fontFamily: landingFonts.body500,
              fontSize: 14,
              color: landingColors.textMuted,
            }}
          >
            {content.hero.badge}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={content.hero.words.join(' ')}
          style={{ marginTop: 24 }}
        >
          {content.hero.words.map((w, i) => {
            const style = [word, { color: i === 2 ? landingColors.lime : landingColors.text }];
            return (
              <HeroWord key={w} index={i} intro={intro} style={style}>
                {w}
              </HeroWord>
            );
          })}
        </View>
        <HeroFade intro={intro}>
          <Text
            style={{
              marginTop: 28,
              maxWidth: bodySize * 28,
              fontFamily: landingFonts.body400,
              fontSize: bodySize,
              lineHeight: bodySize * 1.55,
              color: landingColors.textMuted,
            }}
          >
            {content.hero.body}
          </Text>
        </HeroFade>
        <HeroFade intro={intro} delay={150}>
          <View style={{ marginTop: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <LandingButton label={content.hero.primary} onPress={openGetHissa} />
            <LandingButton
              variant="outline"
              label={content.hero.secondary}
              onPress={() => onNavigate('how')}
            />
          </View>
        </HeroFade>
      </Animated.View>
      <View
        style={{ flex: twoCol ? 1 : undefined }}
        onLayout={(e) => {
          setStageW(e.nativeEvent.layout.width);
          setStageReady(true);
        }}
      >
        {stageW > 0 && <HeroStage columnWidth={stageW} ready={stageReady && intro.ready} />}
      </View>
    </View>
  );
}
