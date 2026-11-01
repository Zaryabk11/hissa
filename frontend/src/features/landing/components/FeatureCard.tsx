import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { FlowCard } from './FlowCard';
import { landingColors, landingFonts, landingRadii } from '../../../shared/theme/landingTokens';

type Props = {
  title: string;
  body: string;
  side: 'left' | 'right';
  lime?: boolean;
  children: ReactNode;
};

/** Title, body and a visual pinned to the bottom. `lime` is the filled check-in card. */
export function FeatureCard({ title, body, side, lime, children }: Props) {
  return (
    <FlowCard side={side}>
      <View
        style={{
          flexGrow: 1,
          padding: 30,
          gap: 18,
          borderRadius: landingRadii.card,
          backgroundColor: lime ? landingColors.lime : landingColors.surface,
          borderWidth: lime ? 0 : 1,
          borderColor: landingColors.line,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: landingFonts.display700,
            fontSize: 26,
            lineHeight: 26 * 1.15,
            color: lime ? landingColors.inkOnLime : landingColors.text,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: landingFonts.body400,
            fontSize: 16,
            lineHeight: 16 * 1.55,
            color: lime ? landingColors.inkOnLime : landingColors.textMuted,
          }}
        >
          {body}
        </Text>
        <View style={{ marginTop: 'auto' }}>{children}</View>
      </View>
    </FlowCard>
  );
}
