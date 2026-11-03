import { z } from 'zod';
import { logger } from '../../shared/logger';
import type { QuestionIntent } from './question-model';

// Gemini only words the question. It never supplies options, counts, calories or health claims;
// the service checks the draft and falls back to the fixed question.
export interface GeminiQuestionClient {
  draft(input: {
    intent: QuestionIntent;
    evidenceSummary: string;
    allowedOptionIds: string[];
  }): Promise<{ text: string; optionIds: string[] }>;
}

const INTENTS: Record<QuestionIntent, string> = {
  symptom_detail: 'asks the person to describe their stomach discomfort after a meal',
  pre_existing: 'asks whether they already felt this way before the meal',
};
const draftSchema = z.object({ text: z.string(), optionIds: z.array(z.string()) });

// A check-in must not wait long for wording, so at most two attempts and an overall deadline here
// (the scan allows three attempts of 10 s each).
const MAX_ATTEMPTS = 2;
const DEADLINE_MS = 8000;
const MIN_RETRY_MS = 50; // not worth another request with less time than this left

export function createGeminiQuestionClient(opts: {
  apiKey: string;
  model: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
  /** Total time for all attempts and pauses. */
  deadlineMs?: number;
}): GeminiQuestionClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`;

  return {
    async draft({ intent, evidenceSummary, allowedOptionIds }) {
      const prompt = [
        `Write one short, neutral, plain-English question that ${INTENTS[intent]}.`,
        'No numbers, no diagnosis, no food advice or restriction, and do not suggest any food caused anything.',
        `Return optionIds exactly as given: ${allowedOptionIds.join(', ')}.`,
        `Summary of this person's own check-ins (for tone only): ${evidenceSummary}`,
      ].join('\n');
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              text: { type: 'STRING' },
              optionIds: { type: 'ARRAY', items: { type: 'STRING', enum: allowedOptionIds } },
            },
            required: ['text', 'optionIds'],
          },
        },
      };

      const deadline = Date.now() + (opts.deadlineMs ?? DEADLINE_MS);
      let res: Response | undefined;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          res = await fetchFn(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(opts.timeoutMs ?? 10000, deadline - Date.now())),
            ),
          });
        } catch (err) {
          if (
            err instanceof Error &&
            err.name === 'TimeoutError' &&
            attempt < MAX_ATTEMPTS &&
            deadline - Date.now() > MIN_RETRY_MS
          )
            continue;
          logger.warn('Gemini question request failed', {
            error: err instanceof Error ? err.name : 'UnknownError',
          });
          throw err;
        }
        const { status } = res;
        if ((status !== 503 && status !== 429) || attempt === MAX_ATTEMPTS) break;
        // A 429 is the free tier's per-minute quota, so wait longer than for a 503.
        const pause = (opts.retryDelayMs ?? 700) * (status === 429 ? 4 : 1) * attempt;
        if (deadline - Date.now() - pause <= MIN_RETRY_MS) break;
        await new Promise((r) => setTimeout(r, pause));
      }
      if (!res?.ok) {
        logger.warn('Gemini question request failed', { status: res?.status });
        throw new Error(`Gemini returned HTTP ${res?.status}`);
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return draftSchema.parse(JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''));
    },
  };
}
