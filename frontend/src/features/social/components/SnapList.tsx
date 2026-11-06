import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Card } from '../../feel/components/Card';
import type { SnapInboxItem } from '../api/snaps';
import { socialContent } from '../content';
import { snapAge, snapExpiresIn } from '../snap-view';
import { personName } from '../social-view';

const c = socialContent.snap;

/** Unopened snaps. Listing them never marks them: opening the viewer does. */
export function SnapList({ items }: { items: SnapInboxItem[] }) {
  const router = useRouter();
  return (
    <View style={{ gap: 10 }}>
      <HissaText variant="label" accessibilityRole="header">
        {c.title}
      </HissaText>
      {items.length === 0 && <HissaText muted>{c.empty}</HissaText>}
      {items.map((s) => (
        <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={c.from(personName(s.sender))} onPress={() => router.push({ pathname: '/snap/[id]', params: { id: s.id } })}>
          <Card gap={4}>
            <HissaText variant="label">{c.from(personName(s.sender))}</HissaText>
            <HissaText variant="caption">{`${snapAge(s.sentAt)}, ${snapExpiresIn(s.expiresAt)}`}</HissaText>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
