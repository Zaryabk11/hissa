import { Image, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { landingColors } from '../../../shared/theme/landingTokens';

const ARC_W = 558;
const ARC_H = 333;

// Pinned to the viewport on web; on native the parent is the viewport already.
const pinned: ViewStyle = Platform.OS === 'web' ? ({ position: 'fixed' } as unknown as ViewStyle) : { position: 'absolute' };

// Where mixBlendMode is unsupported the grain would turn into a grey haze, so skip it.
const canBlend = Platform.OS !== 'web' || (typeof CSS !== 'undefined' && CSS.supports('mix-blend-mode', 'overlay'));

export function Background() {
  return (
    <>
      <View pointerEvents="none" style={[pinned, styles.fill, { zIndex: 0, backgroundColor: landingColors.bg }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="arc" width={ARC_W} height={ARC_H} patternUnits="userSpaceOnUse">
              <Path
                d={`M.5 0V316A${ARC_W} 316 0 0 0 ${ARC_W} 0M0 332.5H${ARC_W}`}
                fill="none"
                stroke="#fff"
                strokeOpacity={0.075}
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#arc)" />
        </Svg>
      </View>
      {canBlend && (
        <View pointerEvents="none" style={[pinned, styles.fill, styles.noise]}>
          <Image
            source={require('../../../../assets/landing/noise.png')}
            resizeMode="repeat"
            style={styles.noiseImg}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { left: 0, top: 0, right: 0, bottom: 0 },
  noise: { zIndex: 60, opacity: 0.5, mixBlendMode: 'overlay' },
  noiseImg: { width: '100%', height: '100%' },
});
