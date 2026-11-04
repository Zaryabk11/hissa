import type { PersonCard } from '../profiles';

export type FriendshipStatus = 'pending' | 'active' | 'declined' | 'removed';

// A row of public.friendships as the repository reads it; the pair is keyed user_low < user_high.
export type FriendshipRow = {
  user_low: string;
  user_high: string;
  requested_by: string;
  status: FriendshipStatus;
};

export type FriendRow = {
  userId: string;
  username: string | null;
  displayName: string | null;
  streak: number;
  loggedToday: boolean;
  nudgedToday: boolean;
};
export type FriendsOverview = {
  friends: FriendRow[];
  loggedCount: number;
  incoming: PersonCard[];
  outgoing: PersonCard[];
};
