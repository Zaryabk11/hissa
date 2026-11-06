import type { ReactNode } from 'react';
import { Card as Sticker } from '../../../shared/ui/hissa/Card';

/** Sticker card with a column gap; the look lives in the shared Card. */
export function Card({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return <Sticker style={{ gap }}>{children}</Sticker>;
}
