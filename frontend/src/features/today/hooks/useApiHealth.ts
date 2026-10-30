import { useEffect, useState } from 'react';
import { getHealth } from '../api/health';

export type ApiHealth = 'loading' | 'ok' | 'unreachable';

export function useApiHealth(): ApiHealth {
  const [state, setState] = useState<ApiHealth>('loading');

  useEffect(() => {
    getHealth()
      .then((res) => setState(res.status === 'ok' ? 'ok' : 'unreachable'))
      .catch(() => setState('unreachable'));
  }, []);

  return state;
}
