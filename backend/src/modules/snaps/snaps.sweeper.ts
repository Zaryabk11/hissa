import type { Job } from '../../shared/jobs';
import type { SnapsService } from './snaps.service';

// The in-process sweep: at start and every 5 minutes. startJobs logs a failing run.
export function createSnapsJob(service: Pick<SnapsService, 'sweep'>): Job {
  return {
    name: 'snaps.sweep',
    everyMs: 300_000,
    run: async () => {
      await service.sweep(new Date());
    },
  };
}
