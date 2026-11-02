import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { hissaRadii } from '../../../shared/theme/hissaTokens';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { todayContent as c } from '../content';

const SECONDS = 4;

/** "Meal removed. Undo, 4s": counts down, then calls onExpire (the removal stays). */
export function UndoBar({ onUndo, onExpire }: { onUndo: () => void; onExpire: () => void }) {
  const t = useHissaTheme();
  const [left, setLeft] = useState(SECONDS);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    if (left <= 0) {
      expire.current();
      return;
    }
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: hissaRadii.control, backgroundColor: t.surf, borderWidth: 1, borderColor: t.hair, paddingLeft: 16 }}
    >
      <HissaText variant="label" style={{ flex: 1 }}>
        {c.undo.removed}
      </HissaText>
      <Pressable accessibilityRole="button" accessibilityLabel={c.undo.undoLabel} onPress={onUndo} style={{ minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' }}>
        <HissaText variant="button" style={{ color: t.pri }}>
          {c.undo.undo(left)}
        </HissaText>
      </Pressable>
    </View>
  );
}
