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
    expect(config.GEMINI_MODEL).toBe('gemini-3.1-flash-lite');
    expect(config.SCAN_DAILY_CAP).toBe(10);
  });

  it('coerces SCAN_DAILY_CAP from a string', () => {
    expect(loadConfig({ ...minimalEnv, SCAN_DAILY_CAP: '3' }).SCAN_DAILY_CAP).toBe(3);
  });

  it('throws when GEMINI_API_KEY is missing', () => {
    expect(() => loadConfig({ ...minimalEnv, GEMINI_API_KEY: undefined })).toThrow(/GEMINI_API_KEY/);
  });
});
