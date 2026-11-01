import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient, GeminiUnavailableError } from '../gemini.client';

const catalog = [
  { slug: 'daal', unit: 'katori' },
  { slug: 'roti', unit: 'piece' },
];
const photo = Buffer.from('jpeg-bytes');

function geminiReply(text: string, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status }),
  ) as unknown as typeof fetch;
}

function client(fetchFn: typeof fetch) {
  return createGeminiClient({ apiKey: 'secret-key', model: 'gemini-test', fetchFn });
}

describe('gemini client', () => {
  it('sends a structured, catalog-only request with the image after the prompt', async () => {
    const fetchFn = geminiReply('[]');
    await client(fetchFn).detectDishes(photo, catalog);

    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
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

  it('rejects with GeminiUnavailableError on a network error, without leaking the key', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const err = await client(fetchFn).detectDishes(photo, catalog).catch((e: unknown) => e);
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
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    expect(await client(fetchFn).detectDishes(photo, catalog)).toEqual([]);
  });
});
