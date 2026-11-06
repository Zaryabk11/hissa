import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hissaRadii } from '../../theme/hissaTokens';
import { useHissaTheme } from '../../theme/HissaThemeProvider';
import { HissaText } from './HissaText';

/** Bottom sheet over a scrim. Tapping the scrim or the system back gesture calls onClose. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const t = useHissaTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,10,5,.55)' }]} />
        <View
          style={{
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            backgroundColor: t.surf,
            borderTopLeftRadius: hissaRadii.panel,
            borderTopRightRadius: hissaRadii.panel,
            borderWidth: 2,
            borderBottomWidth: 0,
            borderColor: t.line,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            gap: 12,
          }}
        >
          {title && (
            <HissaText accessibilityRole="header" variant="value">
              {title}
            </HissaText>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}
