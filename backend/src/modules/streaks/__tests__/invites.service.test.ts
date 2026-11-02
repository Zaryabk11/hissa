import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStreaksService } from '../streaks.service';
import type { StreaksRepository } from '../streaks.repository';

function setup() {
  const repository = {
    createInvite: vi.fn().mockResolvedValue(undefined),
    previewInvite: vi
      .fn()
      .mockResolvedValue({ code: 'ABC123', status: 'pending', inviter_id: 'private' }),
    respondInvite: vi.fn().mockResolvedValue(undefined),
    endPair: vi.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    service: createStreaksService({ repository: repository as unknown as StreaksRepository }),
  };
}
describe('invite service', () => {
  it('creates a secure six-character code and app link', async () => {
    const { service, repository } = setup();
    const result = await service.createInvite('actor');
    expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.linkPath).toBe(`/invite/${result.code}`);
    expect(repository.createInvite).toHaveBeenCalledWith('actor', result.code);
  });
  it('retries only unique code collisions', async () => {
    const { service, repository } = setup();
    repository.createInvite.mockRejectedValueOnce({ code: '23505' });
    await expect(service.createInvite('actor')).resolves.toHaveProperty('code');
    expect(repository.createInvite).toHaveBeenCalledTimes(2);
  });
  it('projects preview to identifiers and status only', async () => {
    const { service } = setup();
    expect(await service.previewInvite('actor', 'ABC123')).toEqual({
      code: 'ABC123',
      status: 'pending',
    });
  });
  it('rejects malformed codes before storage', async () => {
    const { service, repository } = setup();
    await expect(service.previewInvite('actor', 'bad')).rejects.toMatchObject({ status: 400 });
    expect(repository.previewInvite).not.toHaveBeenCalled();
  });
  it('maps database guard rejection to a client error', async () => {
    const { service, repository } = setup();
    repository.respondInvite.mockRejectedValue({
      code: 'P0001',
      message: 'Invitation unavailable',
    });
    await expect(service.respondInvite('actor', 'ABC123', 'accept')).rejects.toMatchObject({
      status: 400,
    });
  });
  it('passes authenticated actor through decline and end', async () => {
    const { service, repository } = setup();
    await service.respondInvite('actor', 'ABC123', 'decline');
    await service.endPair('actor');
    expect(repository.respondInvite).toHaveBeenCalledWith('actor', 'ABC123', 'decline');
    expect(repository.endPair).toHaveBeenCalledWith('actor');
  });
});

// Optional real PostgreSQL checks. Use only a disposable container initialized
// with the repository migrations and Supabase auth roles/schema.
// HISSA_TEST_POSTGRES_CONTAINER=hissa-invites-test npm test -w backend -- invites.service
const execute = promisify(execFile);
const container = process.env.HISSA_TEST_POSTGRES_CONTAINER ?? '';
const users = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
];
async function sql(statement: string): Promise<string> {
  const { stdout } = await execute('docker', [
    'exec',
    container,
    'psql',
    '-U',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-Atc',
    statement,
  ]);
  return stdout.trim();
}
function operation(actor: number, action: string, code = 'ABC123'): Promise<string> {
  return sql(
    `set role service_role; select public.buddy_invite_operation('${users[actor]}','${action}','${code}');`,
  );
}
describe.skipIf(!container)('invite database lifecycle and concurrency', () => {
  beforeAll(async () => {
    await sql(
      `insert into auth.users(id) values ${users.map((id) => `('${id}')`).join(',')} on conflict do nothing;`,
    );
  });
  beforeEach(async () => {
    await sql('truncate public.buddy_pairs cascade');
  });
  it('rejects self, bad, repeated and paired acceptance, and closes declined invites', async () => {
    await operation(0, 'create');
    await expect(operation(0, 'accept')).rejects.toThrow();
    await expect(operation(1, 'accept', 'ZZZZZZ')).rejects.toThrow();
    expect(await operation(1, 'preview')).toContain('"status": "pending"');
    await operation(1, 'decline');
    expect(await sql("select status from public.buddy_pairs where invite_code='ABC123'")).toBe(
      'declined',
    );
    await expect(operation(2, 'accept')).rejects.toThrow();
    await operation(0, 'create', 'NEW123');
    await operation(1, 'accept', 'NEW123');
    await expect(operation(1, 'accept', 'NEW123')).rejects.toThrow();
    await expect(operation(1, 'create', 'NEXT12')).rejects.toThrow();
    await operation(2, 'create', 'THIRD1');
    await expect(operation(1, 'accept', 'THIRD1')).rejects.toThrow();
  });
  it('serializes simultaneous accepts for different invites', async () => {
    await operation(0, 'create');
    await operation(1, 'create', 'OTHER1');
    const outcomes = await Promise.allSettled([
      operation(2, 'accept'),
      operation(2, 'accept', 'OTHER1'),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await sql("select count(*) from public.buddy_pairs where status='active'")).toBe('1');
  });
  it('serializes two recipients accepting the same invite', async () => {
    await operation(0, 'create');
    const outcomes = await Promise.allSettled([operation(1, 'accept'), operation(2, 'accept')]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await sql("select count(*) from public.buddy_pairs where status='active'")).toBe('1');
  });
  it('serializes cross-role creation against acceptance', async () => {
    await operation(0, 'create');
    const outcomes = await Promise.allSettled([
      operation(1, 'accept'),
      operation(1, 'create', 'OTHER1'),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      await sql(
        `select count(*) from public.buddy_pairs where status in ('pending','active') and '${users[1]}' in (inviter_id,invitee_id)`,
      ),
    ).toBe('1');
  });
  it('ends only the actor pair and starts the next pair at fresh acceptance', async () => {
    await operation(0, 'create');
    await operation(1, 'accept');
    await sql("update public.buddy_pairs set accepted_at='2020-01-01' where invite_code='ABC123'");
    await operation(2, 'end');
    expect(await sql("select status from public.buddy_pairs where invite_code='ABC123'")).toBe(
      'active',
    );
    await operation(1, 'end');
    await operation(0, 'create', 'NEW123');
    await operation(2, 'accept', 'NEW123');
    expect(
      await sql(
        "select accepted_at > '2020-01-02'::timestamptz from public.buddy_pairs where invite_code='NEW123'",
      ),
    ).toBe('t');
  });
  it('limits RPC execute and direct pair mutations and historical streak reads', async () => {
    expect(
      await sql(
        "select has_function_privilege('authenticated','public.buddy_invite_operation(uuid,text,text)','EXECUTE')",
      ),
    ).toBe('f');
    expect(
      await sql(
        "select has_function_privilege('anon','public.buddy_invite_operation(uuid,text,text)','EXECUTE')",
      ),
    ).toBe('f');
    expect(
      await sql("select has_table_privilege('authenticated','public.buddy_pairs','UPDATE')"),
    ).toBe('f');
    expect(
      await sql(
        "select qual from pg_policies where tablename='streak_days' and policyname='streak_days_read'",
      ),
    ).not.toContain('buddy_pairs');
  });
});
