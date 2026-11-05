import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { landingColors, landingFonts } from '../../../shared/theme/landingTokens';
import { content, type SectionId } from '../content';
import { useReducedMotion } from '../hooks/useReducedMotion';

const CELL = 44;
const PAD = 4;
const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };

type Icon = { node: (c: string) => ReactNode; turn: number; grow: number };
const stroke = (c: string) => ({ stroke: c, strokeWidth: 1.8, fill: 'none' as const, strokeLinecap: 'round' as const });

// One small glyph per section; each moves its own way when active.
const icons: Partial<Record<SectionId, Icon>> = {
  how: {
    turn: 180,
    grow: 1,
    node: (c) => (
      <>
        <Circle cx="12" cy="12" r="9" {...stroke(c)} />
        <Circle cx="12" cy="12" r="4" {...stroke(c)} />
        <Circle cx="12" cy="5.5" r="1" fill={c} />
      </>
    ),
  },
  features: {
    turn: 90,
    grow: 1.15,
    node: (c) => <Path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" {...stroke(c)} strokeLinejoin="round" />,
  },
  buddy: {
    turn: -20,
    grow: 1.12,
    node: (c) => (
      <>
        <Circle cx="9" cy="12" r="5.5" {...stroke(c)} />
        <Circle cx="15" cy="12" r="5.5" {...stroke(c)} />
      </>
    ),
  },
  faq: {
    turn: -16,
    grow: 1.1,
    node: (c) => (
      <>
        <Path d="M8.5 9a3.5 3.5 0 1 1 5 3.1c-1 .5-1.5 1.1-1.5 2" {...stroke(c)} />
        <Circle cx="12" cy="18" r="1" fill={c} />
      </>
    ),
  },
};

function Glyph({ id, active, reduced }: { id: SectionId; active: boolean; reduced: boolean }) {
  const icon = icons[id]!;
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = reduced ? 0 : withSpring(active ? 1 : 0, SPRING);
  }, [active, reduced, a]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${a.value * icon.turn}deg` }, { scale: 1 + a.value * (icon.grow - 1) }],
  }));
  return (
    <Animated.View style={style}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        {icon.node(active ? landingColors.inkOnLime : landingColors.textMuted)}
      </Svg>
    </Animated.View>
  );
}

/** Icon dock: a lime pill slides to the hovered or focused icon and the glyph moves. Labels stay for screen readers. */
export function NavDock({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const reduced = useReducedMotion();
  const [on, setOn] = useState(-1);
  const x = useSharedValue(PAD);
  const seen = useSharedValue(0);
  useEffect(() => {
    if (on >= 0) x.value = reduced ? PAD + on * CELL : withSpring(PAD + on * CELL, SPRING);
    seen.value = withTiming(on >= 0 ? 1 : 0, { duration: 160 });
  }, [on, reduced, x, seen]);
  const pill = useAnimatedStyle(() => ({
    opacity: seen.value,
    transform: [{ translateX: x.value }, { scale: 0.7 + 0.3 * seen.value }],
  }));
  const links = content.nav.links;
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: PAD,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: landingColors.linePill,
        backgroundColor: landingColors.surface,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: PAD, left: 0, width: CELL, height: CELL, borderRadius: 99, backgroundColor: landingColors.lime },
          pill,
        ]}
      />
      {links.map((l, i) => (
        <Pressable
          key={l.id}
          accessibilityRole="link"
          accessibilityLabel={l.label}
          onPress={() => onNavigate(l.id)}
          onHoverIn={() => setOn(i)}
          onHoverOut={() => setOn(-1)}
          onFocus={() => setOn(i)}
          onBlur={() => setOn(-1)}
          onPressIn={() => setOn(i)}
          onPressOut={() => setOn(-1)}
          style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
        >
          <Glyph id={l.id} active={on === i} reduced={reduced} />
        </Pressable>
      ))}
      {/* Hover label, so the icons are never a guessing game. */}
      {on >= 0 && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: CELL + PAD * 2 + 10, left: PAD + on * CELL + CELL / 2 - 80, width: 160, alignItems: 'center' }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontFamily: landingFonts.body500,
              fontSize: 14,
              color: landingColors.text,
              backgroundColor: landingColors.surface2,
              borderRadius: 99,
              paddingHorizontal: 12,
              paddingVertical: 6,
              overflow: 'hidden',
            }}
          >
            {links[on].label}
          </Text>
        </View>
      )}
    </View>
  );
}
