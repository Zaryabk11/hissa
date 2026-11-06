import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BackHeader } from '../src/features/history/components/BackHeader';
import { getInbox, markInboxRead, type NotificationItem } from '../src/features/social/api/notifications';
import { InboxList } from '../src/features/social/components/InboxList';
import { socialContent as c } from '../src/features/social/content';
import { pokeUnread } from '../src/features/social/useSocialData';
import { HissaRoot } from '../src/shared/ui/hissa/HissaRoot';
import { HissaScreen } from '../src/shared/ui/hissa/HissaScreen';
import { HissaText } from '../src/shared/ui/hissa/HissaText';

export default function Inbox() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Show the list as it was (unread in bold), then mark it read and refresh the tab badge.
  useEffect(() => {
    getInbox()
      .then((r) => {
        setItems(r.items);
        return markInboxRead();
      })
      .then(pokeUnread)
      .catch(() => setFailed(true));
  }, []);


  return (
    <HissaRoot>
      <HissaScreen>
        <BackHeader onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/social'))} />
        <HissaText variant="title" accessibilityRole="header" style={{ marginVertical: 12 }}>
          {c.inbox.title}
        </HissaText>
        {failed && !items && <HissaText accessibilityRole="alert">{c.inbox.failed}</HissaText>}
        {items && (
          <View>
            <InboxList items={items} />
          </View>
        )}
      </HissaScreen>
    </HissaRoot>
  );
}
