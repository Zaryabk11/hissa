import { logger } from '../logger';

export type Job = { name: string; everyMs: number; run: () => Promise<void> };

// Runs each job once now and then every everyMs. A failing run is logged, never thrown.
// ponytail: in-process timers, one instance only; use a real scheduler if the API scales out.
export function startJobs(jobs: Job[]): () => void {
  const timers = jobs.map((job) => {
    const tick = () =>
      job.run().catch((err: unknown) => {
        const e = err instanceof Error ? err : new Error(String(err));
        logger.error(`Job ${job.name} failed`, { error: e.name, message: e.message });
      });
    void tick();
    return setInterval(tick, job.everyMs);
  });
  return () => timers.forEach(clearInterval);
}
