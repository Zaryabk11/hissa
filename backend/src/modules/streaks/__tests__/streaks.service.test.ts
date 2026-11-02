import { describe, expect, it, vi } from 'vitest';
import { createStreaksService } from '../streaks.service';
import type { StreaksRepository } from '../streaks.repository';
const now = new Date('2026-11-05T10:00:00Z');
function setup(patch = {}) {
  const snapshot = {
    pairStatus: 'active',
    pendingInviteCode: null,
    acceptedAt: '2026-11-02T10:00:00Z',
    ownDays: ['2026-11-02', '2026-11-03', '2026-11-04'],
    buddyDays: ['2026-11-02', '2026-11-03', '2026-11-04'],
    unreadNudge: false,
    nudgedToday: false,
    ...patch,
  };
  const repository = {
    status: vi.fn(async () => snapshot),
    markDay: vi.fn(async () => {}),
    nudge: vi.fn(async () => {}),
    ackNudge: vi.fn(async () => {}),
  };
  return {
    service: createStreaksService({ repository: repository as unknown as StreaksRepository }),
    repository,
  };
}
describe('saved-meal buddy status', () => {
  it('marks distinct PKT days across midnight', async () => {
    const { service, repository } = setup();
    await service.markMealSaved('u1', '2026-11-02T18:59:59Z');
    await service.markMealSaved('u1', '2026-11-02T19:00:00Z');
    expect(repository.markDay.mock.calls).toEqual([
      ['u1', '2026-11-02'],
      ['u1', '2026-11-03'],
    ]);
  });
  it('counts completed consecutive days while today is in progress, only since acceptance', async () => {
    const { service } = setup({ acceptedAt: '2026-11-03T10:00:00Z' });
    expect(await service.getStatus('u1', now)).toEqual({
      pairStatus: 'active',
      pendingInviteCode: null,
      streak: 2,
      ownLoggedToday: false,
      buddyLoggedToday: false,
      unreadNudge: false,
    });
  });
  it('includes today when both logged and resets after a missing yesterday', async () => {
    const { service } = setup({
      ownDays: ['2026-11-03', '2026-11-05'],
      buddyDays: ['2026-11-03', '2026-11-05'],
    });
    expect((await service.getStatus('u1', now)).streak).toBe(1);
    expect((await service.getStatus('u1', new Date('2026-11-06T19:00:00Z'))).streak).toBe(0);
  });
  it('does not return internal rows or historical days', async () => {
    const { service } = setup({ meals: [{ calories: 500 }], userId: 'secret' });
    expect(Object.keys(await service.getStatus('u1', now)).sort()).toEqual(
      [
        'pairStatus',
        'pendingInviteCode',
        'streak',
        'ownLoggedToday',
        'buddyLoggedToday',
        'unreadNudge',
      ].sort(),
    );
  });
  it.each([{ nudgedToday: true }, { buddyDays: ['2026-11-05'] }, { pairStatus: 'none' }])(
    'rejects ineligible nudges: %j',
    async (patch) => {
      const { service, repository } = setup(patch);
      await expect(service.nudge('u1', now)).rejects.toThrow();
      expect(repository.nudge).not.toHaveBeenCalled();
    },
  );
  it('sends an eligible nudge and acknowledges only for the recipient', async () => {
    const { service, repository } = setup();
    await service.nudge('u1', now);
    expect(repository.nudge).toHaveBeenCalledWith('u1', '2026-11-05');
    await service.ackNudge('u1');
    expect(repository.ackNudge).toHaveBeenCalledWith('u1');
  });
});
