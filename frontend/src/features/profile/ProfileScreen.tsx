import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSession } from '../../shared/auth/session';
import { useHissaTheme } from '../../shared/theme/HissaThemeProvider';
import { hissaFonts, hissaRadii } from '../../shared/theme/hissaTokens';
import { Card } from '../../shared/ui/hissa/Card';
import { sticker } from '../../shared/ui/hissa/sticker';
import { BackHeader } from '../history/components/BackHeader';
import { StepperRow } from '../onboarding/Stepper';
import { Chip, OptionCard } from '../../shared/ui/hissa/Choice';
import { HissaScreen } from '../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../shared/ui/hissa/HissaText';
import { PrimaryButton } from '../../shared/ui/hissa/PrimaryButton';
import { AvoidsPicker } from '../avoids/AvoidsPicker';
import { avoidsContent } from '../avoids/content';
import { getAvoids, getCatalog, getProfile, putAvoids, putProfile, type Avoids, type Profile } from '../core/api';
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
  const [avoids, setAvoids] = useState<Avoids | null>(null);
  const [dishes, setDishes] = useState<{ slug: string; name: string }[]>([]);
  const [avoidsSaving, setAvoidsSaving] = useState(false);
  const [avoidsMsg, setAvoidsMsg] = useState<{ text: string; alert: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([getAvoids(), getCatalog()])
      .then(([a, cat]) => {
        if (!live) return;
        setAvoids(a);
        setDishes(cat.dishes.map(({ slug, name }) => ({ slug, name })));
      })
      .catch(() => live && setAvoidsMsg({ text: avoidsContent.loadError, alert: true }));
    return () => {
      live = false;
    };
  }, [retry]);

  const saveAvoids = async () => {
    if (!avoids || avoidsSaving) return;
    setAvoidsSaving(true);
    setAvoidsMsg(null);
    try {
      setAvoids(await putAvoids(avoids));
      setAvoidsMsg({ text: avoidsContent.saved, alert: false });
    } catch {
      setAvoidsMsg({ text: avoidsContent.saveError, alert: true });
    } finally {
      setAvoidsSaving(false);
    }
  };

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

  const header = <BackHeader onPress={back} />;

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

      <Card
        tone="turt"
        style={{ marginTop: 20, padding: 20, gap: 2 }}
      >
        <View
          accessible
          accessibilityLabel={`${c.budget.label}: about ${profile.dailyCalorieBudget} ${c.budget.unit}, an estimate`}
        >
        <HissaText variant="label">{c.budget.label}</HissaText>
        <HissaText variant="hero">{profile.dailyCalorieBudget.toLocaleString('en-US')}</HissaText>
        <HissaText variant="caption">{`${c.budget.unit}. ${c.budget.estimate}`}</HissaText>
        <HissaText variant="caption" style={{ marginTop: 4 }}>
          {c.budget.note}
        </HissaText>
        </View>
      </Card>
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
          style={[sticker(t, 2), {
            minHeight: 52,
            paddingHorizontal: 16,
            borderRadius: hissaRadii.control,
            backgroundColor: t.surf,
            color: t.ink,
            fontFamily: hissaFonts.body400,
            fontSize: 16,
          }]}
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
          decrease={c.body.decrease('age')}
          increase={c.body.increase('age')}
          label={c.body.age.label}
          shown={String(form.age)}
          unit={c.body.age.unit}
          onChange={(d) => change({ age: clamp(form.age + d, ...BOUNDS.age) })}
        />
        <StepperRow
          decrease={c.body.decrease('height')}
          increase={c.body.increase('height')}
          label={c.body.height.label}
          shown={feetInches(form.heightIn)}
          unit={c.body.height.unit}
          onChange={(d) => change({ heightIn: clamp(form.heightIn + d, ...BOUNDS.heightIn) })}
        />
        <StepperRow
          decrease={c.body.decrease('weight')}
          increase={c.body.increase('weight')}
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

      <Section title={c.macros.title}>
        <HissaText variant="caption">{c.macros.note}</HissaText>
        {c.macros.fields.map((f) => (
          <TextInput
            key={f.key}
            accessibilityLabel={`${f.label} target in grams`}
            value={form[f.key]}
            onChangeText={(v) => change({ [f.key]: v.replace(/\D/g, '').slice(0, 4) })}
            placeholder={`${f.label}, ${c.macros.placeholder}`}
            placeholderTextColor={t.muted}
            keyboardType="number-pad"
            maxLength={4}
            style={[sticker(t, 2), {
              minHeight: 52,
              paddingHorizontal: 16,
              borderRadius: hissaRadii.control,
              backgroundColor: t.surf,
              color: t.ink,
              fontFamily: hissaFonts.body400,
              fontSize: 16,
            }]}
          />
        ))}
      </Section>

      <Section title={avoidsContent.profileTitle}>
        {avoids && (
          <>
            <AvoidsPicker value={avoids} onChange={(a) => { setAvoids(a); setAvoidsMsg(null); }} dishes={dishes} />
            <PrimaryButton outline label={avoidsSaving ? avoidsContent.saving : avoidsContent.save} disabled={avoidsSaving} onPress={() => void saveAvoids()} />
          </>
        )}
        {avoidsMsg && (
          <HissaText accessibilityRole={avoidsMsg.alert ? 'alert' : undefined} accessibilityLiveRegion="polite">
            {avoidsMsg.text}
          </HissaText>
        )}
      </Section>

      <View style={{ marginTop: 32, gap: 12 }}>
        <PrimaryButton
          outline
          label={c.signOut}
          onPress={() => {
            setSignOutError(false);
            void signOut().then(() => router.replace('/landing')).catch(() => setSignOutError(true));
          }}
        />
        {signOutError && <HissaText accessibilityRole="alert">{c.signOutError}</HissaText>}
        <HissaText variant="caption">{c.footnote}</HissaText>
      </View>
    </HissaScreen>
  );
}
