import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TAP } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';
import { sticker } from './sticker';

/** Floating message with an optional Undo. The caller mounts it while it should show and owns the timeout. */
export function Toast({ message, actionLabel = 'Undo', onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 100, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" aria-live="polite" style={[sticker(t, 3), { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 480, borderRadius: 99, backgroundColor: t.ink, paddingVertical: 4, paddingLeft: 18, paddingRight: onAction ? 6 : 18, minHeight: MIN_TAP }]}>
        <HissaText variant="label" style={{ color: t.bg, flexShrink: 1 }}>
          {message}
        </HissaText>
        {onAction && (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={{ minHeight: MIN_TAP, paddingHorizontal: 14, justifyContent: 'center' }}>
            <HissaText variant="button" style={{ color: t.bg }}>
              {actionLabel}
            </HissaText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
