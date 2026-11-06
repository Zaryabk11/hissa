import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import { Card } from '../../feel/components/Card';
import type { SnapInboxItem } from '../api/snaps';
import { socialContent } from '../content';
import { snapAge, snapExpiresIn } from '../snap-view';
import { personName } from '../social-view';

const c = socialContent.snap;

/** Unopened snaps. Listing them never marks them: only the viewer's Open button does. */
export function SnapList({ items }: { items: SnapInboxItem[] }) {
  const router = useRouter();
  return (
    <View style={{ gap: 10 }}>
      <HissaText variant="label" accessibilityRole="header">
        {c.title}
      </HissaText>
      {items.length === 0 && <HissaText muted>{c.empty}</HissaText>}
      {items.map((s) => (
        <Card key={s.id} gap={4}>
          <HissaText variant="label">{c.from(personName(s.sender))}</HissaText>
          <HissaText variant="caption">{`${snapAge(s.sentAt)}, ${snapExpiresIn(s.expiresAt)}`}</HissaText>
          <View style={{ alignItems: 'flex-end' }}>
            <Pill variant="filled" label={c.open} onPress={() => router.push({ pathname: '/snap/[id]', params: { id: s.id } })} />
          </View>
        </Card>
      ))}
    </View>
  );
}
