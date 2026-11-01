import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { landingColors, landingFonts } from '../../../shared/theme/landingTokens';
import { content } from '../content';

const mono = Platform.select({ web: 'ui-monospace, Menlo, monospace', default: 'monospace' });

/** Striped placeholder with a dashed ring and a static scan band. */
export function SnapVisual() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="stripes" width={28} height={28} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect width={28} height={28} fill={landingColors.stripeDark} />
            <Rect x={14} width={14} height={28} fill={landingColors.surface2} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>
      <View
        style={{
          width: 150,
          height: 150,
          borderRadius: 99,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: landingColors.lime,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ fontFamily: mono, fontSize: 14, textAlign: 'center', color: landingColors.textGrey }}>
          {content.how.snapPlaceholder}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 70,
          height: 56,
          backgroundColor: landingColors.limeAlpha16,
          borderBottomWidth: 2,
          borderBottomColor: landingColors.lime,
        }}
      />
    </View>
  );
}

const chipBase = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  height: 44,
  paddingHorizontal: 14,
  borderRadius: 14,
} as const;

const chipText = { fontFamily: landingFonts.body600, fontSize: 16, color: landingColors.text } as const;
const chipSide = {
  marginLeft: 'auto',
  fontFamily: landingFonts.body400,
  fontSize: 16,
  color: landingColors.textGrey,
} as const;

/** Detected-dish chips plus the "which one?" question chip. */
export function ConfirmVisual() {
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', gap: 8, paddingHorizontal: 26, backgroundColor: landingColors.surface }}
    >
      {content.how.chips.map((c) => (
        <View
          key={c.label}
          style={[
            chipBase,
            c.selected
              ? { backgroundColor: landingColors.limeSelected, borderWidth: 1, borderColor: landingColors.lime }
              : { backgroundColor: landingColors.bg, borderWidth: 1, borderColor: landingColors.line },
          ]}
        >
          {c.selected ? <Text style={[chipText, { color: landingColors.lime }]}>✓</Text> : <View style={{ width: 12 }} />}
          <Text style={chipText}>{c.label}</Text>
          <Text style={chipSide}>{c.portion}</Text>
        </View>
      ))}
      <View style={[chipBase, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: landingColors.lime }]}>
        <Text style={[chipText, { color: landingColors.lime }]}>?</Text>
        <Text style={[chipText, { color: landingColors.lime }]}>{content.how.question}</Text>
      </View>
    </View>
  );
}

/** Plate with one highlighted wedge. */
export function EatVisual() {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={content.how.plateLabel}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: landingColors.surface }}
    >
      <Svg width={170} height={170} viewBox="0 0 220 220">
        <Circle cx={110} cy={110} r={104} fill={landingColors.plate} stroke={landingColors.lineOutline} strokeWidth={3} />
        <Path
          d="M110 110 L110 14 A96 96 0 0 1 193 158 Z"
          fill={landingColors.limeAlpha25}
          stroke={landingColors.lime}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path d="M110 110 L193 158 A96 96 0 0 1 27 158 Z" fill="none" stroke={landingColors.barGrey} strokeWidth={3} />
        <Path d="M110 110 L27 158 A96 96 0 0 1 110 14 Z" fill="none" stroke={landingColors.barGrey} strokeWidth={3} />
      </Svg>
    </View>
  );
}
