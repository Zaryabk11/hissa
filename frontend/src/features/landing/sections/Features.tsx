import { useEffect } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { fluid, landingColors, landingFonts, landingType } from '../../../shared/theme/landingTokens';
import { Eyebrow } from '../components/Eyebrow';
import { FeatureCard } from '../components/FeatureCard';
import { Grid } from '../components/Grid';
import { Section } from '../components/Section';
import { SectionTitle } from '../components/SectionTitle';
import { content } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

const c = content.features;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_EMPTY = 628;
const RING_FINAL = 323;

/** Draws once on mount from empty to 323 of 628; reduced motion starts at that final state. */
function BudgetRing() {
  const reduced = useReducedMotion();
  const offset = useSharedValue(reduced ? RING_FINAL : RING_EMPTY);
  useEffect(() => {
    offset.value = reduced
      ? RING_FINAL
      : withDelay(300, withTiming(RING_FINAL, { duration: 2000, easing: Easing.out(Easing.cubic) }));
  }, [reduced, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={c.budget.label}
      style={{ alignItems: 'center', paddingTop: 8 }}
    >
      <View style={{ width: 180, height: 180 }}>
        <Svg width={180} height={180} viewBox="0 0 220 220" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={110} cy={110} r={100} fill="none" stroke={landingColors.ringTrack} strokeWidth={10} />
          <AnimatedCircle
            cx={110}
            cy={110}
            r={100}
            fill="none"
            stroke={landingColors.lime}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={RING_EMPTY}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: landingFonts.body500, fontSize: 14, color: landingColors.textMuted }}>
            {c.budget.about}
          </Text>
          <Text style={{ fontFamily: landingFonts.display700, fontSize: 44, lineHeight: 44, color: landingColors.text }}>
            {c.budget.value}
          </Text>
          <Text style={{ fontFamily: landingFonts.body500, fontSize: 14, color: landingColors.textMuted }}>
            {c.budget.unit}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Three past bars, today in lime, the rest dashed outlines. */
function WeekBars() {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={c.week.label}
      style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}
    >
      <Svg style={{ position: 'absolute', top: 5, left: 0, right: 0 }} width="100%" height={2}>
        <Line x1={0} x2="100%" y1={1} y2={1} stroke={landingColors.barGrey} strokeWidth={1.5} strokeDasharray="6 4" />
      </Svg>
      {c.week.bars.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: h,
            borderRadius: 8,
            backgroundColor: i === c.week.todayIndex ? landingColors.lime : i < c.week.todayIndex ? landingColors.barGrey : 'transparent',
            ...(i > c.week.todayIndex && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: landingColors.lineStrong }),
          }}
        />
      ))}
    </View>
  );
}

function DishChips() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {c.dishes.chips.map((d) => (
        <View
          key={d}
          style={{
            height: 40,
            paddingHorizontal: 16,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: landingColors.lineStrong,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: landingFonts.body500, fontSize: 16, color: landingColors.text }}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

function CheckIn() {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {c.checkin.options.map((o, i) => {
        const on = i === c.checkin.selectedIndex;
        return (
          <View
            key={o}
            style={{
              flex: 1,
              height: 80,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: landingColors.inkOnLime,
              backgroundColor: on ? landingColors.inkOnLime : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{ fontFamily: landingFonts.body600, fontSize: 16, color: on ? landingColors.lime : landingColors.inkOnLime }}
            >
              {o}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Features({ onLayout }: { onLayout: (e: LayoutChangeEvent) => void }) {
  const { width } = useLandingLayout();
  return (
    <Section onLayout={onLayout} paddingY={fluid(72, 10, 120, width)}>
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <SectionTitle size={landingType.sectionH2} marginTop={16}>
        {c.title}
      </SectionTitle>
      <Grid minCol={330} gap={16} marginTop={fluid(36, 5, 64, width)}>
        <FeatureCard side="left" title={c.budget.t} body={c.budget.d}>
          <BudgetRing />
        </FeatureCard>
        <FeatureCard side="right" title={c.week.t} body={c.week.d}>
          <WeekBars />
        </FeatureCard>
        <FeatureCard side="left" title={c.dishes.t} body={c.dishes.d}>
          <DishChips />
        </FeatureCard>
        <FeatureCard side="right" lime title={c.checkin.t} body={c.checkin.d}>
          <CheckIn />
        </FeatureCard>
      </Grid>
    </Section>
  );
}
