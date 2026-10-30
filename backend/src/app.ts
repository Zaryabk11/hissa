import express, { type Express } from 'express';
import { createModuleRouters } from './modules';
import { loadConfig, type Config } from './shared/config';
import { createDb } from './shared/db';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler';
import { createRequireAuth } from './shared/middleware/auth';

export function createApp(config: Config = loadConfig()): Express {
  const app = express();
  const db = createDb(config);
  const requireAuth = createRequireAuth(db);

  app.use(express.json());
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  for (const [name, router] of Object.entries(createModuleRouters({ db, config }))) {
    app.use(`/api/${name}`, requireAuth, router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
