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

  // The Expo web app sends bearer tokens across origins. Answer its preflight before auth.
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Small default body limit for every route. Only /api/scan and /api/snaps take photos: their 8 MB
  // parser is mounted after requireAuth below, so anonymous clients get a 401 before any large body.
  const takesPhotos = (path: string) => /^\/api\/(scan|snaps)(\/|$)/.test(path);
  const smallJson = express.json({ limit: '100kb' });
  app.use((req, res, next) => (takesPhotos(req.path) ? next() : smallJson(req, res, next)));
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const { routers, jobs } = createModuleRouters({ db, config });
  app.locals.jobs = jobs;
  for (const [name, router] of Object.entries(routers)) {
    const guards = takesPhotos(`/api/${name}`)
      ? [requireAuth, express.json({ limit: '8mb' })]
      : [requireAuth];
    app.use(`/api/${name}`, ...guards, router);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
