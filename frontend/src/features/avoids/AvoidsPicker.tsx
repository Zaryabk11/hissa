import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { MIN_TAP, hissaFonts, hissaRadii } from '../../shared/theme/hissaTokens';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import type { Avoids } from '../core/api';
import { filterDishes, toggleDish, toggleProtein } from './avoids-view';
import { PROTEINS, avoidsContent as c } from './content';

const SEARCH_ABOVE = 12;

// Not the shared Chip: that one is flex:1 and cannot wrap.
function WrapChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: MIN_TAP,
        paddingHorizontal: 16,
        borderRadius: hissaRadii.control,
        backgroundColor: selected ? t.pri : t.surf,
        borderWidth: selected ? 0 : 1,
        borderColor: t.hair,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HissaText variant="button" style={{ color: selected ? t.onPri : t.ink }}>
        {label}
      </HissaText>
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
  const shown = searching ? (query.trim() ? filterDishes(dishes, query) : []) : dishes;

  return (
    <View style={{ gap: 20 }}>
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
        {searching && (
          <>
            <TextInput
              accessibilityLabel={c.search}
              value={query}
              onChangeText={setQuery}
              placeholder={c.search}
              placeholderTextColor={t.muted}
              style={{
                minHeight: 52,
                paddingHorizontal: 16,
                borderRadius: hissaRadii.control,
                backgroundColor: t.surf,
                borderWidth: 1,
                borderColor: t.hair,
                color: t.ink,
                fontFamily: hissaFonts.body400,
                fontSize: 16,
              }}
            />
            {value.dishes.length > 0 && (
              <Wrap>
                {value.dishes.map((s) => (
                  <WrapChip key={s} label={nameOf(s)} selected onPress={() => onChange(toggleDish(value, s))} />
                ))}
              </Wrap>
            )}
          </>
        )}
        <Wrap>
          {shown
            .filter((d) => !searching || !value.dishes.includes(d.slug))
            .map((d) => (
              <WrapChip key={d.slug} label={d.name} selected={value.dishes.includes(d.slug)} onPress={() => onChange(toggleDish(value, d.slug))} />
            ))}
        </Wrap>
      </View>
    </View>
  );
}
