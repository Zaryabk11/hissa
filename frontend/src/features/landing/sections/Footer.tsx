import RNMaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ComponentRef, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, Text, View, type TextStyle } from 'react-native';
import {
  fluid,
  landingColors,
  landingFonts,
  landingRadii,
  landingSpacing,
  landingType,
} from '../../../shared/theme/landingTokens';
import { MeshBlobs } from '../components/MeshBlobs';
import { content, type SectionId } from '../content';
import { useLandingLayout } from '../hooks/useLandingLayout';
import { WORD_ANCHOR_ID } from '../robot/types';

const c = content.footer;
// The package's typings don't resolve against this repo's @types/react, so give it the one prop shape used here.
const MaskedView = RNMaskedView as unknown as ComponentType<{ maskElement: ReactElement; children: ReactNode }>;
const gradient = [landingColors.lime, landingColors.wordmarkMid, landingColors.wordmarkEnd] as const;

/** Gradient-filled "hissa". Native masks a gradient; MaskedView is a no-op on web, so CSS clips one there. */
function Wordmark({ fs }: { fs: number }) {
  const text: TextStyle = {
    fontFamily: landingFonts.display800,
    fontSize: fs,
    lineHeight: fs,
    letterSpacing: fs * -0.07,
    textAlign: 'center',
    paddingTop: fs * 0.05,
    paddingHorizontal: fs * 0.05,
    paddingBottom: fs * 0.12,
  };
  return (
    <View nativeID={WORD_ANCHOR_ID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Platform.OS === 'web' ? (
        <Text
          style={[
            text,
            {
              color: 'transparent',
              backgroundImage: `linear-gradient(100deg, ${gradient[0]} 10%, ${gradient[1]} 45%, ${gradient[2]} 90%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              userSelect: 'none',
            } as TextStyle,
          ]}
        >
          {c.wordmark}
        </Text>
      ) : (
        <MaskedView maskElement={<Text style={[text, { color: '#000' }]}>{c.wordmark}</Text>}>
          <LinearGradient colors={gradient} locations={[0.1, 0.45, 0.9]} start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 0.6 }}>
            <Text style={[text, { opacity: 0 }]}>{c.wordmark}</Text>
          </LinearGradient>
        </MaskedView>
      )}
    </View>
  );
}

export function Footer({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { width, gutter, isMobile } = useLandingLayout();
  const fs = fluid(landingType.wordmark.min, landingType.wordmark.vw, landingType.wordmark.max, width);
  const panel = useRef<ComponentRef<typeof View>>(null);
  // Seeded with the size the panel will have (wordmark line plus its padding) so the blobs are placed on first paint.
  const [size, setSize] = useState({ w: Math.min(landingSpacing.maxWidth, width - gutter * 2) - 2, h: fs * 1.17 });
  const link = { fontFamily: landingFonts.body500, fontSize: 16, color: landingColors.textLink };
  return (
    <View
      style={{
        width: '100%',
        maxWidth: landingSpacing.maxWidth + gutter * 2,
        alignSelf: 'center',
        paddingHorizontal: gutter,
        paddingTop: fluid(120, 16, 200, width),
        paddingBottom: 32,
      }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 32 }}>
        <Text
          style={{ maxWidth: 16 * 22, fontFamily: landingFonts.body500, fontSize: 16, lineHeight: 16 * 1.55, color: landingColors.textGrey }}
        >
          {c.disclaimer}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 28 }}>
          {content.nav.links.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="link"
              accessibilityLabel={l.label}
              onPress={() => onNavigate(l.id)}
              style={{ minHeight: landingSpacing.minTap, justifyContent: 'center' }}
            >
              <Text style={link}>{l.label}</Text>
            </Pressable>
          ))}
          {/* shortcut: no privacy page exists yet, so this link has no target; wire it when one does. */}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={c.privacy}
            onPress={() => {}}
            style={{ minHeight: landingSpacing.minTap, justifyContent: 'center' }}
          >
            <Text style={link}>{c.privacy}</Text>
          </Pressable>
        </View>
      </View>
      <View
        ref={panel}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width - 2, h: e.nativeEvent.layout.height - 2 })}
        style={{
          marginTop: isMobile ? 128 : 48, // on phones the robot stands above the panel
          overflow: 'hidden',
          borderRadius: landingRadii.mesh,
          backgroundColor: landingColors.meshPanel,
          borderWidth: 1,
          borderColor: landingColors.line,
        }}
      >
        <MeshBlobs w={size.w} h={size.h} panel={panel} />
        <Wordmark fs={fs} />
      </View>
      <View style={{ marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontFamily: landingFonts.body400, fontSize: 14, color: landingColors.textFaint }}>{c.copyright}</Text>
        <Text style={{ fontFamily: landingFonts.body400, fontSize: 14, color: landingColors.textFaint }}>{c.tagline}</Text>
      </View>
    </View>
  );
}
