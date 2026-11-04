import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getProfile } from '../core/api';
import { getOverview, type FriendsOverview } from './api/friends';
import { getCelebrations, getMyGoal, type Celebration, type Goal } from './api/goals';
import { getInbox } from './api/notifications';
import { latestGuard } from './social-view';

const POLL_MS = 20_000;
const UNREAD_POLL_MS = 30_000;

type Data = { username: string | null; overview: FriendsOverview | null; goal: Goal | null; celebrations: Celebration[] };

/** Social tab data. Refreshes on focus and every 20 s while focused; `username === null` means the prompt is due. */
export function useSocialData() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const alive = useRef(false);
  const begin = useRef(latestGuard()).current;

  const refresh = useCallback(async () => {
    const isLatest = begin();
    try {
      const { username } = await getProfile();
      const next: Data = { username, overview: null, goal: null, celebrations: [] };
      if (username) {
        [next.overview, next.goal, next.celebrations] = await Promise.all([getOverview(), getMyGoal(), getCelebrations()]);
      }
      if (!alive.current || !isLatest()) return;
      setData(next);
      setError(false);
    } catch {
      if (alive.current && isLatest()) setError(true);
    }
  }, [begin]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void refresh();
      const id = setInterval(() => void refresh(), POLL_MS);
      return () => {
        alive.current = false;
        clearInterval(id);
      };
    }, [refresh]),
  );

  return { ...data, refresh, loading: !data && !error, error };
}

// The tab bar and the inbox screen share one unread count; `pokeUnread` makes the bar re-read it now.
const pokes = new Set<() => void>();
export const pokeUnread = () => pokes.forEach((p) => p());

/** Unread inbox count for the Social tab badge: polled every 30 s, and again when `focusKey` changes or on `pokeUnread`. */
export function useUnread(focusKey: unknown) {
  const [unread, setUnread] = useState(0);
  const load = useCallback(() => {
    getInbox().then((r) => setUnread(r.unread), () => undefined);
  }, []);
  useEffect(() => {
    load();
    pokes.add(load);
    const id = setInterval(load, UNREAD_POLL_MS);
    return () => {
      pokes.delete(load);
      clearInterval(id);
    };
  }, [load]);
  useEffect(load, [load, focusKey]);
  return unread;
}
