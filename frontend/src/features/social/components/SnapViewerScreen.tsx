import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReducer, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { ApiError } from '../../../shared/api/client';
import { HissaScreen } from '../../../shared/ui/hissa/HissaScreen';
import { HissaText } from '../../../shared/ui/hissa/HissaText';
import { Pill } from '../../../shared/ui/hissa/Pill';
import { PrimaryButton } from '../../../shared/ui/hissa/PrimaryButton';
import { BackHeader } from '../../history/components/BackHeader';
import { openSnap, reportSnap, type OpenedSnap, type ReportReason } from '../api/snaps';
import { socialContent } from '../content';
import { reportReducer, snapDataUri, snapViewReducer } from '../snap-view';
import { personName } from '../social-view';
import { pokeUnread } from '../useSocialData';

const c = socialContent.snap;
const REASONS: ReportReason[] = ['spam', 'inappropriate_photo', 'harassment', 'other'];

export function SnapViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, dispatch] = useReducer(snapViewReducer, { phase: 'warn' });
  const [snap, setSnap] = useState<OpenedSnap | null>(null); // the photo lives in memory only, as a data URI
  const [reporting, setReporting] = useState(false);
  const [report, dispatchReport] = useReducer(reportReducer, 'idle');
  const started = useRef(false); // synchronous guard: state alone lets a fast double tap open twice

  // The only place openSnap is called: the Open button. Never on mount, focus or refetch.
  const onOpen = async () => {
    if (started.current || (view.phase !== 'warn' && view.phase !== 'failed')) return;
    started.current = true;
    dispatch('press');
    try {
      setSnap(await openSnap(id));
      dispatch('opened');
    } catch (e) {
      dispatch(e instanceof ApiError && e.status === 404 ? 'gone' : 'failed');
      started.current = false;
    } finally {
      pokeUnread();
    }
  };

  const onReport = async (reason: ReportReason) => {
    if (report === 'sending') return;
    setReporting(false);
    dispatchReport('send');
    try {
      await reportSnap(id, reason);
      dispatchReport('sent');
    } catch {
      dispatchReport('failed');
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/inbox'));

  return (
    <HissaScreen>
        <BackHeader onPress={back} />
        {(view.phase === 'warn' || view.phase === 'opening' || view.phase === 'failed') && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <HissaText variant="title" accessibilityRole="header">
              {c.warn}
            </HissaText>
            <HissaText muted>{c.warnBody}</HissaText>
            {view.phase === 'failed' && <HissaText accessibilityRole="alert">{c.failedOpen}</HissaText>}
            <PrimaryButton label={view.phase === 'opening' ? c.opening : c.openButton} disabled={view.phase === 'opening'} onPress={() => void onOpen()} />
          </View>
        )}
        {view.phase === 'gone' && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <HissaText variant="title" accessibilityRole="alert">
              {c.gone}
            </HissaText>
            <PrimaryButton label={c.back} onPress={back} />
          </View>
        )}
        {view.phase === 'shown' && snap && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <HissaText variant="label">{c.from(personName(snap.sender))}</HissaText>
            <Image
              source={{ uri: snapDataUri(snap.image, snap.mimeType) }}
              accessibilityLabel={c.photoLabel}
              resizeMode="contain"
              style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }}
            />
            {report === 'sent' && <HissaText accessibilityRole="alert">{c.reported}</HissaText>}
            {report === 'failed' && <HissaText accessibilityRole="alert">{c.reportFailed}</HissaText>}
            {reporting ? (
              <View style={{ gap: 8 }}>
                <HissaText variant="label">{c.reportTitle}</HissaText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REASONS.map((r) => (
                    <Pill key={r} label={c.reasons[r]} onPress={() => void onReport(r)} />
                  ))}
                  <Pill variant="quiet" label={c.cancel} onPress={() => setReporting(false)} />
                </View>
              </View>
            ) : (
              report !== 'sent' && <Pill variant="quiet" label={c.report} disabled={report === 'sending'} onPress={() => setReporting(true)} />
            )}
          </View>
        )}
    </HissaScreen>
  );
}
