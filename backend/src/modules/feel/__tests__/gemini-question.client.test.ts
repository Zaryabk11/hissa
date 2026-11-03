import { describe, expect, it, vi } from 'vitest';
import { createGeminiQuestionClient } from '../gemini-question.client';

const input = {
  intent: 'pre_existing' as const,
  evidenceSummary: '4 check-ins',
  allowedOptionIds: ['yes', 'no', 'not_sure'],
};
const out = { text: 'Did you feel this way before this meal?', optionIds: input.allowedOptionIds };

function reply(text: string, status = 200): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status,
      }),
  ) as unknown as typeof fetch;
}
const client = (fetchFn: typeof fetch) =>
  createGeminiQuestionClient({ apiKey: 'secret-key', model: 'm', fetchFn, retryDelayMs: 0 });

describe('gemini question client', () => {
  it('sends a structured request with only the summary and allowed ids', async () => {
    const fetchFn = reply(JSON.stringify(out));
    expect(await client(fetchFn).draft(input)).toEqual(out);
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.properties.optionIds.items.enum).toEqual(
      input.allowedOptionIds,
    );
    expect(body.contents[0].parts[0].text).toContain('4 check-ins');
    expect(init.body as string).not.toContain('secret-key');
  });

  it.each(['not json', '{"text":"ok","optionIds":[1]}', '{}', ''])(
    'rejects malformed output %j',
    async (text) => {
      await expect(client(reply(text)).draft(input)).rejects.toThrow();
    },
  );

  it('retries a 503 once and then succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }),
        ),
      );
    expect(await client(fetchFn as unknown as typeof fetch).draft(input)).toEqual(out);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 400 and gives up after two timeouts', async () => {
    const bad = reply('{}', 400);
    await expect(client(bad).draft(input)).rejects.toThrow();
    expect(bad).toHaveBeenCalledTimes(1);
    const slow = vi.fn().mockRejectedValue(new DOMException('t', 'TimeoutError'));
    await expect(client(slow as unknown as typeof fetch).draft(input)).rejects.toThrow();
    expect(slow).toHaveBeenCalledTimes(2);
  });
});
