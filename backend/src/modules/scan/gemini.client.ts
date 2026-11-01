import { z } from 'zod';
import { logger } from '../../shared/logger';

export interface CatalogEntry {
  slug: string;
  unit: string;
}

export interface DetectedDish {
  dish: string; // a catalog slug, or 'unknown'
  portion: number;
  confidence: number;
}

// Gemini may only answer from the catalog (structured output with an enum plus 'unknown').
// It never returns calorie numbers.
export interface GeminiClient {
  detectDishes(photo: Buffer, catalog: CatalogEntry[]): Promise<DetectedDish[]>;
}

export class GeminiUnavailableError extends Error {
  constructor(message = 'Gemini is unavailable') {
    super(message);
    this.name = 'GeminiUnavailableError';
  }
}

const PROMPT =
  "Name each distinct dish visible in this photo of a meal, choosing only from the allowed list. Answer 'unknown' if none fits. For each dish give portion_units as a count of that dish's own unit, and confidence from 0 to 1. Most prominent dish first.";

const answerSchema = z.array(
  z.object({ dish: z.string(), portion_units: z.number(), confidence: z.number() }),
);

export function createGeminiClient(opts: {
  apiKey: string;
  model: string;
  fetchFn?: typeof fetch;
}): GeminiClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`;

  return {
    async detectDishes(photo, catalog) {
      const slugs = new Set(catalog.map((c) => c.slug));
      const prompt = [PROMPT, ...catalog.map((c) => `${c.slug} (unit: ${c.unit})`)].join('\n');
      const body = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: photo.toString('base64') } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                dish: { type: 'STRING', enum: [...slugs, 'unknown'] },
                portion_units: { type: 'NUMBER' },
                confidence: { type: 'NUMBER' },
              },
              required: ['dish', 'portion_units', 'confidence'],
            },
          },
        },
      };

      // Log only the status or error name: never the URL, key, headers, photo or body.
      const unavailable = (meta: { status: number } | { error: string }, message: string) => {
        logger.warn('Gemini request failed', meta);
        return new GeminiUnavailableError(message);
      };

      let json: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      try {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw unavailable({ status: res.status }, `Gemini returned HTTP ${res.status}`);
        json = await res.json();
      } catch (err) {
        if (err instanceof GeminiUnavailableError) throw err;
        throw unavailable({ error: err instanceof Error ? err.name : 'UnknownError' }, 'Gemini request failed');
      }

      try {
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return answerSchema.parse(JSON.parse(text)).map((d) => ({
          dish: slugs.has(d.dish) ? d.dish : 'unknown',
          portion: d.portion_units,
          confidence: Math.min(1, Math.max(0, d.confidence)),
        }));
      } catch {
        return [];
      }
    },
  };
}
