import type { Router } from 'express';
import type { Config } from '../../shared/config';
import type { Db } from '../../shared/db';
import { createFeelController } from './feel.controller';
import { createGeminiQuestionClient } from './gemini-question.client';
import { createFeelRepository } from './feel.repository';
import { createFeelRouter } from './feel.routes';
import { createFeelService, type FeelService } from './feel.service';

export type { FeelService };
export type { Question } from './question-bank';
export type { PatternCard } from './weekly-pattern';

// The only file other modules may import.
export function createFeelModule({ db, config }: { db: Db; config: Config }): {
  router: Router;
  service: FeelService;
} {
  const service = createFeelService({
    repository: createFeelRepository(db),
    questionClient: createGeminiQuestionClient({
      apiKey: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
      timeoutMs: config.GEMINI_TIMEOUT_MS,
    }),
  });
  const router = createFeelRouter(createFeelController(service));
  return { router, service };
}
