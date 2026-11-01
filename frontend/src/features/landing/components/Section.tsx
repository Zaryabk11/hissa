import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { landingColors, landingSpacing } from '../../../shared/theme/landingTokens';
import { useLandingLayout } from '../hooks/useLandingLayout';

type Props = {
  children: ReactNode;
  /** Full-bleed tinted band with top and bottom borders. */
  band?: boolean;
  paddingY?: number;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: ViewStyle;
};

/** Full-width row with a centred inner column: max 1120 plus the fluid gutter. */
export function Section({ children, band, paddingY = 0, onLayout, style }: Props) {
  const { gutter } = useLandingLayout();
  return (
    <View
      onLayout={onLayout}
      style={
        band && {
          backgroundColor: landingColors.band,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: landingColors.lineNav,
        }
      }
    >
      <View
        style={[
          {
            width: '100%',
            maxWidth: landingSpacing.maxWidth + gutter * 2,
            alignSelf: 'center',
            paddingHorizontal: gutter,
            paddingVertical: paddingY,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
