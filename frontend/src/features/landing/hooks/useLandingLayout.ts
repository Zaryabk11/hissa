import { useWindowDimensions } from 'react-native';
import { fluid, landingSpacing } from '../../../shared/theme/landingTokens';

/** Live viewport width plus the values every section derives from it. */
export function useLandingLayout() {
  const { width } = useWindowDimensions();
  const gutter = fluid(landingSpacing.gutter.min, landingSpacing.gutter.vw, landingSpacing.gutter.max, width);
  // The HTML wrapper is content-box: 1120 of content plus the gutters.
  const contentWidth = Math.min(landingSpacing.maxWidth, width - gutter * 2);
  return { width, gutter, contentWidth, isMobile: width < landingSpacing.mobileBreakpoint };
}
