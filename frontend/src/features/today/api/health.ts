import { apiGet } from '../../../shared/api/client';

export function getHealth() {
  return apiGet<{ status: string }>('/api/health');
}
