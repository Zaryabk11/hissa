import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { landingColors } from '../../shared/theme/landingTokens';
import { Background } from './components/Background';
import type { SectionId } from './content';
import { useLandingLayout } from './hooks/useLandingLayout';
import { Hero } from './sections/Hero';
import { How } from './sections/How';
import { Idea } from './sections/Idea';
import { Marquee } from './sections/Marquee';
import { NAV_HEIGHT, Nav } from './sections/Nav';

export function LandingPage() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [ys, setYs] = useState<Partial<Record<SectionId, number>>>({});
  const { gutter, contentWidth } = useLandingLayout();

  const mark = (id: SectionId) => (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    setYs((prev) => ({ ...prev, [id]: y }));
  };
  // Sections not built yet have no y, so their links do nothing for now.
  const go = (id: SectionId) => {
    const y = ys[id];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - NAV_HEIGHT), animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: landingColors.bg }}>
      <Background />
      <ScrollView ref={scroll} style={{ flex: 1, zIndex: 1 }} contentContainerStyle={{ paddingTop: NAV_HEIGHT }}>
        <View onLayout={mark('top')}>
          <Hero contentWidth={contentWidth} gutter={gutter} onNavigate={go} />
        </View>
        <Marquee />
        <Idea />
        <How onLayout={mark('how')} />
      </ScrollView>
      <Nav onNavigate={go} />
    </View>
  );
}
