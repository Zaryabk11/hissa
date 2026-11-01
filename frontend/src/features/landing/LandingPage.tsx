import { useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { landingColors } from '../../shared/theme/landingTokens';
import { Background } from './components/Background';
import { CursorRing } from './components/CursorRing';
import { ScrollYContext } from './components/FlowCard';
import type { SectionId } from './content';
import { useLandingLayout } from './hooks/useLandingLayout';
import { HeroIntroContext, useHeroIntroState } from './robot/HeroIntro';
import { RobotLayer } from './robot/RobotLayer';
import { Buddy } from './sections/Buddy';
import { Cta } from './sections/Cta';
import { Faq } from './sections/Faq';
import { Features } from './sections/Features';
import { Footer } from './sections/Footer';
import { Hero } from './sections/Hero';
import { How } from './sections/How';
import { Idea } from './sections/Idea';
import { Marquee } from './sections/Marquee';
import { NAV_HEIGHT, Nav } from './sections/Nav';

export function LandingPage() {
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scroll);
  const [ys, setYs] = useState<Partial<Record<SectionId, number>>>({});
  const { gutter, contentWidth } = useLandingLayout();
  const intro = useHeroIntroState();

  const mark = (id: SectionId) => (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    setYs((prev) => ({ ...prev, [id]: y }));
  };
  const go = (id: SectionId) => {
    const y = ys[id];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - NAV_HEIGHT), animated: true });
  };

  return (
    <HeroIntroContext.Provider value={intro.value}>
      <View style={{ flex: 1, backgroundColor: landingColors.bg }}>
        <Background />
        <ScrollYContext.Provider value={scrollY}>
          <Animated.ScrollView
            ref={scroll}
            style={{ flex: 1, zIndex: 1 }}
            contentContainerStyle={{ paddingTop: NAV_HEIGHT }}
          >
            <View onLayout={mark('top')}>
              <Hero contentWidth={contentWidth} gutter={gutter} onNavigate={go} />
            </View>
            <Marquee />
            <Idea />
            <How onLayout={mark('how')} />
            <Features onLayout={mark('features')} />
            <Buddy onLayout={mark('buddy')} onNavigate={go} />
            <Faq onLayout={mark('faq')} />
            <Cta onLayout={mark('join')} onNavigate={go} />
            <Footer onNavigate={go} />
          </Animated.ScrollView>
        </ScrollYContext.Provider>
        <Nav onNavigate={go} />
        {Platform.OS === 'web' && <CursorRing />}
        {intro.enabled && <RobotLayer events={intro.events} onFail={intro.fail} />}
      </View>
    </HeroIntroContext.Provider>
  );
}
