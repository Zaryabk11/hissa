import { describe, expect, it } from 'vitest';
import { loadConfig } from '..';

const minimalEnv = {
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  GEMINI_API_KEY: 'gemini',
};

describe('loadConfig', () => {
  it('defaults GEMINI_MODEL and SCAN_DAILY_CAP', () => {
    const config = loadConfig(minimalEnv);
    expect(config.GEMINI_MODEL).toBe('gemini-flash-lite-latest');
    expect(config.SCAN_DAILY_CAP).toBe(10);
  });

  it('coerces SCAN_DAILY_CAP from a string', () => {
    expect(loadConfig({ ...minimalEnv, SCAN_DAILY_CAP: '3' }).SCAN_DAILY_CAP).toBe(3);
  });

  it('defaults GEMINI_TIMEOUT_MS to 10000 and accepts an override', () => {
    expect(loadConfig(minimalEnv).GEMINI_TIMEOUT_MS).toBe(10000);
    expect(loadConfig({ ...minimalEnv, GEMINI_TIMEOUT_MS: '30000' }).GEMINI_TIMEOUT_MS).toBe(30000);
  });

  it('falls back to the default GEMINI_MODEL when it is set to an empty string', () => {
    expect(loadConfig({ ...minimalEnv, GEMINI_MODEL: '' }).GEMINI_MODEL).toBe(
      'gemini-flash-lite-latest',
    );
  });

  it.each(['0', 'abc'])('rejects SCAN_DAILY_CAP=%s', (cap) => {
    expect(() => loadConfig({ ...minimalEnv, SCAN_DAILY_CAP: cap })).toThrow(/SCAN_DAILY_CAP/);
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    expect(() => loadConfig({ ...minimalEnv, GEMINI_API_KEY: undefined })).toThrow(
      /GEMINI_API_KEY/,
    );
  });

  it('leaves DEMO_USER_ID unset when absent or empty and accepts a user id', () => {
    const id = '4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
    expect(loadConfig(minimalEnv).DEMO_USER_ID).toBeUndefined();
    expect(loadConfig({ ...minimalEnv, DEMO_USER_ID: '' }).DEMO_USER_ID).toBeUndefined();
    expect(loadConfig({ ...minimalEnv, DEMO_USER_ID: id }).DEMO_USER_ID).toBe(id);
    expect(() => loadConfig({ ...minimalEnv, DEMO_USER_ID: 'not-an-id' })).toThrow(/DEMO_USER_ID/);
  });
});
