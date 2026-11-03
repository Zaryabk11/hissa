import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useHissaTheme } from '../../../shared/theme/HissaThemeProvider';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { feelContent } from '../content';
import { getPattern } from '../api/feel';
import { patternView, type PatternCard as Card_ } from '../feel-view';
import { Card } from './Card';
import { Bone } from './Skeleton';

/** The weekly pattern card. Any error hides the card: it is a bonus, never a blocker. */
export function PatternCard() {
  const t = useHissaTheme();
  const c = feelContent.pattern;
  const [card, setCard] = useState<Card_ | null | undefined>(undefined); // undefined = loading, null = unavailable

  useFocusEffect(
    useCallback(() => {
      let live = true;
      getPattern()
        .then((next) => live && setCard(next))
        .catch(() => live && setCard(null));
      return () => {
        live = false;
      };
    }, []),
  );

  if (card === null) return null;
  if (card === undefined)
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={c.title}
        accessibilityState={{ busy: true }}
      >
        <Bone width="100%" height={120} radius={18} />
      </View>
    );
  const view = patternView(card);
  if (!view) return null;

  return (
    <Card gap={10}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <HissaText variant="label" accessibilityRole="header">
          {c.title}
        </HissaText>
        {card.isSample ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 99,
              backgroundColor: t.tint,
            }}
          >
            <HissaText variant="caption" style={{ color: t.tintInk }}>
              {c.sample}
            </HissaText>
          </View>
        ) : null}
      </View>

      {view.kind === 'progress' ? (
        <>
          <HissaText variant="value">{view.caption}</HissaText>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={view.caption}
            accessibilityValue={{
              min: 0,
              max: card.needed,
              now: Math.min(card.checkins, card.needed),
            }}
            style={{ height: 8, borderRadius: 4, backgroundColor: t.hair, overflow: 'hidden' }}
          >
            <View
              style={{
                width: `${view.fraction * 100}%`,
                height: 8,
                borderRadius: 4,
                backgroundColor: t.pri,
              }}
            />
          </View>
          <HissaText muted>{c.progressHelp}</HissaText>
        </>
      ) : null}

      {view.kind === 'none' ? (
        <>
          <HissaText variant="label">{c.noneTitle}</HissaText>
          <HissaText muted>{c.noneBody}</HissaText>
        </>
      ) : null}

      {view.kind === 'finding' ? (
        <>
          <HissaText>{view.label}</HissaText>
          {view.counts.map((line) => (
            <HissaText key={line} variant="label">
              {line}
            </HissaText>
          ))}
          <HissaText variant="caption">{c.caveat}</HissaText>
        </>
      ) : null}
    </Card>
  );
}
