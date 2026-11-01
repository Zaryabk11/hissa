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

  // Small default body limit for every route. Only /api/scan takes photos: its 8 MB parser is mounted
  // after requireAuth below, so anonymous clients get a 401 before any large body is parsed.
  const smallJson = express.json({ limit: '100kb' });
  app.use((req, res, next) =>
    req.path.startsWith('/api/scan') ? next() : smallJson(req, res, next),
  );
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  for (const [name, router] of Object.entries(createModuleRouters({ db, config }))) {
    const guards = name === 'scan' ? [requireAuth, express.json({ limit: '8mb' })] : [requireAuth];
    app.use(`/api/${name}`, ...guards, router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
