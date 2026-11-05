import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { fluid, landingColors, landingFonts } from '../../../shared/theme/landingTokens';
import { LandingButton } from '../components/LandingButton';
import { content } from '../content';
import { openGetHissa, startOnboarding } from '../getHissa';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** A bowl: the lower half of a thick ring that cups the headline. */
function Bowl({ R, sw, top, animate }: { R: number; sw: number; top: number; animate: boolean }) {
  const rc = R - sw / 2; // radius of the ring's centre line
  return (
    <Animated.View
      entering={animate ? FadeIn.duration(1400) : undefined}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top,
        left: '50%',
        marginLeft: -R,
        width: R * 2,
        height: R * 2,
      }}
    >
      <Svg width={R * 2} height={R * 2}>
        <Defs>
          {/* Fades in from the top so the open ends dissolve into the page. */}
          <LinearGradient
            id="bowl"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1={R * 0.3}
            x2="0"
            y2={R * 1.4}
          >
            <Stop offset="0" stopColor={landingColors.lime} stopOpacity={0} />
            <Stop offset="1" stopColor={landingColors.lime} stopOpacity={0.09} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${sw / 2} ${R} A ${rc} ${rc} 0 0 0 ${R * 2 - sw / 2} ${R}`}
          fill="none"
          stroke="url(#bowl)"
          strokeWidth={sw}
        />
        {[1.3, 1.8].map((k) => {
          const r = R - sw * k;
          return (
            <Path
              key={k}
              d={`M ${R - r} ${R} A ${r} ${r} 0 0 0 ${R + r} ${R}`}
              fill="none"
              stroke="#fff"
              strokeOpacity={0.07}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

export function Hero({ gutter }: { contentWidth: number; gutter: number }) {
  const { width } = useLandingLayout();
  const reduced = useReducedMotion();
  // The whole hero fades in as one sequence: bowl, headline line by line, then text, buttons, small line.
  const animate = !reduced;
  const h1 = fluid(54, 9.5, 124, width);
  const padTop = fluid(40, 6, 72, width);
  const R = Math.min(Math.max(width * 0.5, 260), 560);
  const sw = R * 0.16;
  const titleH = h1 * 0.9 * content.hero.words.length;
  const word = {
    fontFamily: landingFonts.display800,
    fontSize: h1,
    lineHeight: h1 * 0.9,
    letterSpacing: h1 * -0.045,
    textTransform: 'uppercase',
    textAlign: 'center',
  } as const;
  const bodySize = fluid(17, 1.5, 19, width);
  return (
    <View
      style={{
        width: '100%',
        overflow: 'hidden',
        alignItems: 'center',
        paddingHorizontal: gutter,
        paddingTop: padTop,
        paddingBottom: fluid(56, 8, 96, width),
      }}
    >
      <Bowl R={R} sw={sw} top={padTop + titleH + sw * 0.35 - R * 2} animate={animate} />
      <View accessible accessibilityRole="header" accessibilityLabel={content.hero.words.join(' ')}>
        {content.hero.words.map((w, i) => (
          <Animated.Text
            key={w}
            entering={animate ? FadeInDown.delay(300 + i * 160).duration(900) : undefined}
            style={[word, { color: i === 2 ? landingColors.lime : landingColors.text }]}
          >
            {w}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text
        entering={animate ? FadeIn.delay(1000).duration(900) : undefined}
        style={{
          marginTop: fluid(40, 6, 72, width),
          maxWidth: bodySize * 28,
          textAlign: 'center',
          fontFamily: landingFonts.body400,
          fontSize: bodySize,
          lineHeight: bodySize * 1.55,
          color: landingColors.textMuted,
        }}
      >
        {content.hero.body}
      </Animated.Text>
      <Animated.View
        entering={animate ? FadeIn.delay(1250).duration(900) : undefined}
        style={{
          marginTop: 32,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <LandingButton label={content.hero.primary} onPress={openGetHissa} />
        <LandingButton variant="outline" label={content.hero.secondary} onPress={startOnboarding} />
      </Animated.View>
      <Animated.Text
        entering={animate ? FadeIn.delay(1500).duration(900) : undefined}
        style={{
          marginTop: 36,
          textAlign: 'center',
          fontFamily: landingFonts.body500,
          fontSize: 14,
          color: landingColors.textGrey,
        }}
      >
        {content.hero.badge}
      </Animated.Text>
    </View>
  );
}
