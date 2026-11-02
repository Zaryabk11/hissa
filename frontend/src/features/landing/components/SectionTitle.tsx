import type { ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';
import { fluid, landingColors, landingFonts } from '../../../shared/theme/landingTokens';
import { useLandingLayout } from '../hooks/useLandingLayout';

type Props = {
  children: ReactNode;
  size: { min: number; vw: number; max: number };
  /** display: 800 uppercase block title. statement: 700 sentence-case title. */
  variant?: 'display' | 'statement';
  maxEm?: number;
  marginTop?: number;
};

export function SectionTitle({ children, size, variant = 'display', maxEm, marginTop = 0 }: Props) {
  const { width } = useLandingLayout();
  const fs = fluid(size.min, size.vw, size.max, width);
  const display = variant === 'display';
  const style: TextStyle = {
    marginTop,
    fontFamily: display ? landingFonts.display800 : landingFonts.display700,
    fontSize: fs,
    lineHeight: fs * (display ? 0.95 : 1.02),
    letterSpacing: fs * (display ? -0.04 : -0.035),
    textTransform: display ? 'uppercase' : 'none',
    color: landingColors.text,
    maxWidth: maxEm ? fs * maxEm : undefined,
  };
  return (
    <Text accessibilityRole="header" style={style}>
      {children}
    </Text>
  );
}
