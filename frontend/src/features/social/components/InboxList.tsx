import { View } from 'react-native';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Card } from '../../feel/components/Card';
import type { NotificationItem } from '../api/notifications';
import { socialContent as c } from '../content';
import { notificationLine } from '../social-view';

export function InboxList({ items }: { items: NotificationItem[] }) {
  if (items.length === 0) return <HissaText muted>{c.inbox.empty}</HissaText>;
  return (
    <View style={{ gap: 10 }}>
      {items.map((n) => (
        <Card key={n.id} gap={4}>
          <HissaText variant={n.read ? 'body' : 'label'}>{notificationLine(n)}</HissaText>
          <HissaText variant="caption">{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</HissaText>
        </Card>
      ))}
    </View>
  );
}
