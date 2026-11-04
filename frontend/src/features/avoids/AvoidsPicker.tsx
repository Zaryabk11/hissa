import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { MIN_TAP, hissaFonts, hissaRadii } from '../../shared/theme/hissaTokens';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import type { Avoids } from '../core/api';
import { filterDishes, toggleDish, toggleProtein } from './avoids-view';
import { PROTEINS, avoidsContent as c } from './content';

const SEARCH_ABOVE = 12;

const Icon = ({ d, color, size = 16 }: { d: string; color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d={d} />
  </Svg>
);

// Not the shared Chip: that one is flex:1 and cannot wrap. A selected chip carries a check, or an x when `removable`.
function WrapChip({ label, selected, removable, onPress }: { label: string; selected: boolean; removable?: boolean; onPress: () => void }) {
  const t = useHissaTheme();
  const ink = selected ? t.onPri : t.ink;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: MIN_TAP,
        paddingHorizontal: 16,
        borderRadius: MIN_TAP / 2,
        backgroundColor: selected ? t.pri : t.surf,
        borderWidth: selected ? 0 : 1,
        borderColor: t.hair,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {selected && !removable && <Icon d="M5 12l4 4 10-10" color={ink} />}
      <HissaText variant="button" style={{ color: ink }}>
        {label}
      </HissaText>
      {selected && removable && <Icon d="M6 6l12 12M18 6L6 18" color={ink} size={14} />}
    </Pressable>
  );
}

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
);

export function AvoidsPicker({
  value,
  onChange,
  dishes,
}: {
  value: Avoids;
  onChange: (a: Avoids) => void;
  dishes: { slug: string; name: string }[];
}) {
  const t = useHissaTheme();
  const [query, setQuery] = useState('');
  const searching = dishes.length > SEARCH_ABOVE;
  const nameOf = (slug: string) => dishes.find((d) => d.slug === slug)?.name ?? slug;
  const typed = query.trim().length > 0;
  const matches = searching && typed ? filterDishes(dishes.filter((d) => !value.dishes.includes(d.slug)), query) : [];

  return (
    <View style={{ gap: 24 }}>
      {searching && (
        <View style={{ gap: 8 }}>
          <View
            style={{
              minHeight: 52,
              paddingHorizontal: 16,
              borderRadius: hissaRadii.control,
              backgroundColor: t.surf,
              borderWidth: 1,
              borderColor: t.hair,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth={2.2} strokeLinecap="round">
              <Circle cx={11} cy={11} r={7} />
              <Path d="M20 20l-3.5-3.5" />
            </Svg>
            <TextInput
              accessibilityLabel={c.search}
              value={query}
              onChangeText={setQuery}
              placeholder={c.search}
              placeholderTextColor={t.muted}
              autoCorrect={false}
              style={{ flex: 1, minHeight: 50, color: t.ink, fontFamily: hissaFonts.body400, fontSize: 16 }}
            />
          </View>
          {typed && (
            <View style={{ borderRadius: hissaRadii.control, borderWidth: 1, borderColor: t.hair, backgroundColor: t.surf, overflow: 'hidden' }}>
              {matches.length === 0 && (
                <HissaText muted style={{ padding: 16 }}>
                  {c.noMatch}
                </HissaText>
              )}
              {matches.map((d, i) => (
                <Pressable
                  key={d.slug}
                  accessibilityRole="button"
                  accessibilityLabel={c.add(d.name)}
                  onPress={() => {
                    onChange(toggleDish(value, d.slug));
                    setQuery('');
                  }}
                  style={{ minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: i > 0 ? 1 : 0, borderTopColor: t.hair }}
                >
                  <HissaText>{d.name}</HissaText>
                  <Icon d="M12 5v14M5 12h14" color={t.muted} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
      <View style={{ gap: 12 }}>
        <HissaText variant="label">{c.proteins}</HissaText>
        <Wrap>
          {PROTEINS.map((p) => (
            <WrapChip key={p.id} label={p.label} selected={value.proteins.includes(p.id)} onPress={() => onChange(toggleProtein(value, p.id))} />
          ))}
        </Wrap>
      </View>
      <View style={{ gap: 12 }}>
        <HissaText variant="label">{c.dishes}</HissaText>
        {searching && value.dishes.length === 0 ? (
          <HissaText variant="caption">{c.dishesHint}</HissaText>
        ) : (
          <Wrap>
            {(searching ? value.dishes.map((slug) => ({ slug, name: nameOf(slug) })) : dishes).map((d) => (
              <WrapChip key={d.slug} label={d.name} selected={value.dishes.includes(d.slug)} removable={searching} onPress={() => onChange(toggleDish(value, d.slug))} />
            ))}
          </Wrap>
        )}
      </View>
    </View>
  );
}
