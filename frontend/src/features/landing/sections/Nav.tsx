import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import { landingColors, landingFonts, landingSpacing } from '../../../shared/theme/landingTokens';
import { LandingButton } from '../components/LandingButton';
import { content, type SectionId } from '../content';
import { openGetHissa } from '../getHissa';
import { useLandingLayout } from '../hooks/useLandingLayout';

/** 12 + 44 + 12 padding, plus the 1px border. Pages offset their content by this. */
export const NAV_HEIGHT = 69;

// Blur only exists on web; elsewhere the translucent fill stands alone.
const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(14px)' } as unknown as ViewStyle) : null;

export function Nav({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { gutter, isMobile } = useLandingLayout();
  return (
    <View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          backgroundColor: landingColors.navBg,
          borderBottomWidth: 1,
          borderBottomColor: landingColors.lineNav,
        },
        blur,
      ]}
    >
      <View
        style={{
          width: '100%',
          maxWidth: landingSpacing.maxWidth + gutter * 2,
          alignSelf: 'center',
          paddingHorizontal: gutter,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={content.nav.homeLabel}
          onPress={() => onNavigate('top')}
          style={{ minHeight: landingSpacing.minTap, flexDirection: 'row', alignItems: 'center', gap: 7 }}
        >
          <Text
            style={{
              fontFamily: landingFonts.display800,
              fontSize: 28,
              lineHeight: 28,
              letterSpacing: -1.12,
              color: landingColors.text,
            }}
          >
            hissa
          </Text>
          <View style={{ width: 9, height: 9, borderRadius: 99, marginTop: 12, backgroundColor: landingColors.lime }} />
        </Pressable>
        {!isMobile && (
          <View style={{ flexDirection: 'row', gap: 32 }}>
            {content.nav.links.map((l) => (
              <Pressable
                key={l.id}
                accessibilityRole="link"
                accessibilityLabel={l.label}
                onPress={() => onNavigate(l.id)}
                style={{ minHeight: landingSpacing.minTap, justifyContent: 'center' }}
              >
                <Text style={{ fontFamily: landingFonts.body500, fontSize: 16, color: landingColors.textMuted }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <LandingButton size="nav" label={content.nav.cta} onPress={openGetHissa} />
      </View>
    </View>
  );
}
