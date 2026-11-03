import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSession } from '../../shared/auth/session';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaFonts, hissaRadii } from '../../shared/theme/hissaTokens';
import { Chip, OptionCard } from '../../shared/ui/hissa/Choice';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { getProfile, putProfile, type Profile } from '../core/api';
import { profileContent as c } from './content';
import {
  BOUNDS,
  NAME_MAX,
  clamp,
  feetInches,
  formToPayload,
  isDirty,
  profileToForm,
  type ProfileForm,
} from './profile-view';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 28, gap: 12 }}>
      <HissaText variant="label" accessibilityRole="header">
        {title}
      </HissaText>
      {children}
    </View>
  );
}

function StepButton({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  const t = useHissaTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: hissaRadii.control,
        borderWidth: 1,
        borderColor: t.hair,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HissaText variant="label" style={{ fontSize: 22, lineHeight: 28 }}>
        {glyph}
      </HissaText>
    </Pressable>
  );
}

function StepperRow({
  label,
  shown,
  unit,
  onChange,
}: {
  label: string;
  shown: string;
  unit: string;
  onChange: (d: number) => void;
}) {
  const t = useHissaTheme();
  const what = label.toLowerCase();
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}, ${shown} ${unit}`.trim()}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{
        height: 72,
        paddingLeft: 16,
        paddingRight: 12,
        borderRadius: hissaRadii.control,
        backgroundColor: t.surf,
        borderWidth: 1,
        borderColor: t.hair,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <HissaText variant="button" muted style={{ flex: 1 }}>
        {label}
      </HissaText>
      <StepButton glyph="-" label={c.body.decrease(what)} onPress={() => onChange(-1)} />
      <View
        style={{
          minWidth: 76,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <HissaText variant="value">{shown}</HissaText>
        {unit !== '' && <HissaText variant="caption">{unit}</HissaText>}
      </View>
      <StepButton glyph="+" label={c.body.increase(what)} onPress={() => onChange(1)} />
    </View>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const t = useHissaTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; alert: boolean } | null>(null);
  const [signOutError, setSignOutError] = useState(false);

  useEffect(() => {
    void retry;
    let live = true;
    getProfile()
      .then((p) => {
        if (live) {
          setProfile(p);
          setForm(profileToForm(p));
        }
      })
      .catch(() => {
        if (live) setLoadError(true);
      });
    return () => {
      live = false;
    };
  }, [retry]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/today'));
  const change = (patch: Partial<ProfileForm>) => {
    setForm((f) => f && { ...f, ...patch });
    setMessage(null);
  };

  const save = useCallback(async () => {
    if (!profile || !form || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const next = await putProfile(formToPayload(form, profile));
      setProfile(next);
      setForm(profileToForm(next));
      setMessage({ text: c.saved(next.dailyCalorieBudget.toLocaleString('en-US')), alert: false });
    } catch {
      setMessage({ text: c.saveError, alert: true });
    } finally {
      setSaving(false);
    }
  }, [profile, form, saving]);

  const header = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.back}
      onPress={back}
      style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 12 }}
    >
      <HissaText variant="button">{`< ${c.back}`}</HissaText>
    </Pressable>
  );

  if (loadError)
    return (
      <HissaScreen>
        {header}
        <HissaText accessibilityRole="alert" style={{ marginTop: 16 }}>
          {c.loadError}
        </HissaText>
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            label={c.retry}
            onPress={() => {
              setLoadError(false);
              setRetry((n) => n + 1);
            }}
          />
        </View>
      </HissaScreen>
    );
  if (!profile || !form)
    return (
      <HissaScreen>
        {header}
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={c.loading}
          accessibilityState={{ busy: true }}
          style={{ marginTop: 16 }}
        >
          <HissaText muted>{c.loading}</HissaText>
        </View>
      </HissaScreen>
    );

  const dirty = isDirty(form, profile);
  return (
    <HissaScreen
      actionBar={
        <PrimaryButton
          label={saving ? c.saving : c.save}
          disabled={!dirty || saving}
          onPress={() => void save()}
        />
      }
    >
      {header}
      <HissaText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
        {c.title}
      </HissaText>

      <View
        accessible
        accessibilityLabel={`${c.budget.label}: about ${profile.dailyCalorieBudget} ${c.budget.unit}, an estimate`}
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 24,
          backgroundColor: t.surf,
          borderWidth: 1,
          borderColor: t.hair,
          gap: 2,
        }}
      >
        <HissaText variant="label">{c.budget.label}</HissaText>
        <HissaText variant="hero">{profile.dailyCalorieBudget.toLocaleString('en-US')}</HissaText>
        <HissaText variant="caption">{`${c.budget.unit}. ${c.budget.estimate}`}</HissaText>
        <HissaText variant="caption" style={{ marginTop: 4 }}>
          {c.budget.note}
        </HissaText>
      </View>
      {message && (
        <HissaText
          accessibilityRole={message.alert ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={{ marginTop: 12 }}
        >
          {message.text}
        </HissaText>
      )}

      <Section title={c.name.label}>
        <TextInput
          accessibilityLabel={c.name.label}
          value={form.displayName}
          onChangeText={(displayName) => change({ displayName })}
          placeholder={c.name.placeholder}
          placeholderTextColor={t.muted}
          maxLength={NAME_MAX}
          autoCapitalize="words"
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
      </Section>

      <Section title={c.goal.title}>
        <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
          {c.goal.options.map((o) => (
            <OptionCard
              key={o.id}
              title={o.title}
              sub={o.sub}
              selected={form.goal === o.id}
              onPress={() => change({ goal: o.id })}
            />
          ))}
        </View>
      </Section>

      <Section title={c.body.title}>
        <StepperRow
          label={c.body.age.label}
          shown={String(form.age)}
          unit={c.body.age.unit}
          onChange={(d) => change({ age: clamp(form.age + d, ...BOUNDS.age) })}
        />
        <StepperRow
          label={c.body.height.label}
          shown={feetInches(form.heightIn)}
          unit={c.body.height.unit}
          onChange={(d) => change({ heightIn: clamp(form.heightIn + d, ...BOUNDS.heightIn) })}
        />
        <StepperRow
          label={c.body.weight.label}
          shown={String(form.weightKg)}
          unit={c.body.weight.unit}
          onChange={(d) => change({ weightKg: clamp(form.weightKg + d, ...BOUNDS.weightKg) })}
        />
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
          {c.body.sex.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              selected={form.sex === s.id}
              onPress={() => change({ sex: s.id })}
            />
          ))}
        </View>
      </Section>

      <Section title={c.activity.title}>
        <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
          {c.activity.options.map((o) => (
            <OptionCard
              key={o.id}
              title={o.title}
              sub={o.sub}
              selected={form.activityLevel === o.id}
              onPress={() => change({ activityLevel: o.id })}
            />
          ))}
        </View>
      </Section>

      <View style={{ marginTop: 32, gap: 12 }}>
        <PrimaryButton
          outline
          label={c.signOut}
          onPress={() => {
            setSignOutError(false);
            void signOut().catch(() => setSignOutError(true));
          }}
        />
        {signOutError && <HissaText accessibilityRole="alert">{c.signOutError}</HissaText>}
        <HissaText variant="caption">{c.footnote}</HissaText>
      </View>
    </HissaScreen>
  );
}
