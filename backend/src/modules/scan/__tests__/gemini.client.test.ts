import { describe, expect, it, vi } from 'vitest';
import { logger } from '../../../shared/logger';
import { createGeminiClient, GeminiUnavailableError } from '../gemini.client';

const catalog = [
  { slug: 'daal', unit: 'katori' },
  { slug: 'roti', unit: 'piece' },
];
const photo = Buffer.from('jpeg-bytes');

function geminiReply(text: string, status = 200): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status,
      }),
  ) as unknown as typeof fetch;
}

function client(fetchFn: typeof fetch, timeoutMs?: number) {
  return createGeminiClient({
    apiKey: 'secret-key',
    model: 'gemini-test',
    fetchFn,
    timeoutMs,
    retryDelayMs: 0,
  });
}

describe('gemini client', () => {
  it('sends a structured, catalog-only request with the image after the prompt', async () => {
    const fetchFn = geminiReply('[]');
    await client(fetchFn).detectDishes(photo, catalog);

    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');

    const body = JSON.parse(init.body as string);
    const parts = body.contents[0].parts;
    expect(parts[0].text).toContain('daal (unit: katori)');
    expect(parts[0].text).toContain('roti (unit: piece)');
    expect(parts[1].inline_data.mime_type).toBe('image/jpeg');
    expect(parts[1].inline_data.data).toBe(photo.toString('base64'));
    expect(body.generationConfig.responseMimeType).toBe('application/json');

    const props = body.generationConfig.responseSchema.items.properties;
    expect(props.dish.enum).toEqual(['daal', 'roti', 'unknown']);
    expect(Object.keys(props).sort()).toEqual(['confidence', 'dish', 'portion_units']);
  });

  it('maps a valid answer', async () => {
    const out = await client(
      geminiReply('[{"dish":"daal","portion_units":1.5,"confidence":0.9}]'),
    ).detectDishes(photo, catalog);
    expect(out).toEqual([{ dish: 'daal', portion: 1.5, confidence: 0.9 }]);
  });

  it('maps off-catalog slugs to unknown and clamps confidence', async () => {
    const out = await client(
      geminiReply(
        '[{"dish":"pizza","portion_units":1,"confidence":0.8},{"dish":"roti","portion_units":2,"confidence":7},{"dish":"daal","portion_units":1,"confidence":-1}]',
      ),
    ).detectDishes(photo, catalog);
    expect(out.map((d) => [d.dish, d.confidence])).toEqual([
      ['unknown', 0.8],
      ['roti', 1],
      ['daal', 0],
    ]);
  });

  it('rejects with GeminiUnavailableError on HTTP 429', async () => {
    await expect(client(geminiReply('', 429)).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
  });

  it('rejects with GeminiUnavailableError on HTTP 503', async () => {
    await expect(client(geminiReply('', 503)).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
  });

  it('retries a 503 and returns the later answer', async () => {
    const ok = JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] } }] });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(ok, { status: 200 }));
    await expect(
      client(fetchFn as unknown as typeof fetch).detectDishes(photo, catalog),
    ).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('gives up after three 503s', async () => {
    const fetchFn = geminiReply('', 503);
    await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
      GeminiUnavailableError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  describe('retries a slow call', () => {
    // Gemini's latency has a long tail (1 s to almost 60 s for the same photo); a fresh request is usually fast.
    const timeoutError = () => new DOMException('The operation timed out', 'TimeoutError');

    it('retries a timed-out call and returns the later answer', async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(timeoutError())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: '[{"dish":"daal","portion_units":1,"confidence":0.9}]' }],
                  },
                },
              ],
            }),
          ),
        ) as unknown as typeof fetch;
      const out = await client(fetchFn).detectDishes(photo, catalog);
      expect(out).toEqual([{ dish: 'daal', portion: 1, confidence: 0.9 }]);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('gives up after three timeouts', async () => {
      const fetchFn = vi.fn(async () => {
        throw timeoutError();
      }) as unknown as typeof fetch;
      await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('retries a 429 (per-minute quota) and returns the later answer', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(new Response('{}', { status: 429 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: '[{"dish":"roti","portion_units":2,"confidence":0.8}]' }],
                  },
                },
              ],
            }),
          ),
        ) as unknown as typeof fetch;
      const out = await client(fetchFn).detectDishes(photo, catalog);
      expect(out).toEqual([{ dish: 'roti', portion: 2, confidence: 0.8 }]);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('gives up after three 429s', async () => {
      const fetchFn = geminiReply('', 429);
      await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    it('does not retry a client error such as HTTP 400', async () => {
      const fetchFn = geminiReply('', 400);
      await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout', () => {
    it('passes the configured timeout to AbortSignal.timeout', async () => {
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      await client(geminiReply('[]'), 1234).detectDishes(photo, catalog);
      expect(timeout).toHaveBeenCalledExactlyOnceWith(1234);
      timeout.mockRestore();
    });

    it('defaults to 10000 ms per attempt', async () => {
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      await client(geminiReply('[]')).detectDishes(photo, catalog);
      expect(timeout).toHaveBeenCalledExactlyOnceWith(10000);
      timeout.mockRestore();
    });

    it('rejects with GeminiUnavailableError when the request is aborted by the timeout', async () => {
      const fetchFn = vi.fn(async () => {
        throw new DOMException('The operation timed out', 'TimeoutError');
      }) as unknown as typeof fetch;
      await expect(client(fetchFn, 10).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
    });
  });

  it('rejects with GeminiUnavailableError on a network error, without leaking the key', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const err = await client(fetchFn)
      .detectDishes(photo, catalog)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GeminiUnavailableError);
    expect((err as Error).message).not.toContain('secret-key');
  });

  it.each([['not json'], ['{"dish":"daal"}'], ['[{"dish":"daal"}]'], ['']])(
    'resolves to [] for malformed output %j',
    async (text) => {
      expect(await client(geminiReply(text)).detectDishes(photo, catalog)).toEqual([]);
    },
  );

  it('resolves to [] when the response has no candidates', async () => {
    const fetchFn = vi.fn(
      async () => new Response('{}', { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await client(fetchFn).detectDishes(photo, catalog)).toEqual([]);
  });

  describe('failure logging', () => {
    it('logs only the HTTP status on a non-ok response', async () => {
      const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      await client(geminiReply('', 429))
        .detectDishes(photo, catalog)
        .catch(() => {});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('Gemini request failed', { status: 429 });
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-key');
      warn.mockRestore();
    });

    it('logs only the error name when fetch throws', async () => {
      const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const fetchFn = vi.fn(async () => {
        throw new DOMException('secret-key timed out', 'TimeoutError');
      }) as unknown as typeof fetch;
      await client(fetchFn)
        .detectDishes(photo, catalog)
        .catch(() => {});
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith('Gemini request failed', { error: 'TimeoutError' });
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-key');
      warn.mockRestore();
    });

    it('rejects with GeminiUnavailableError when the body is not valid JSON at all', async () => {
      const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const fetchFn = vi.fn(
        async () => new Response('<html>oops</html>', { status: 200 }),
      ) as unknown as typeof fetch;
      await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
      expect(warn).toHaveBeenCalledWith('Gemini request failed', { error: 'SyntaxError' });
      warn.mockRestore();
    });

    it('maps a body read that fails to GeminiUnavailableError, not []', async () => {
      const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const fetchFn = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new DOMException('aborted', 'AbortError');
        },
      })) as unknown as typeof fetch;
      await expect(client(fetchFn).detectDishes(photo, catalog)).rejects.toBeInstanceOf(
        GeminiUnavailableError,
      );
      expect(warn).toHaveBeenCalledWith('Gemini request failed', { error: 'AbortError' });
      warn.mockRestore();
    });
  });
});
