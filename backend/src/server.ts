import { createApp } from './app';
import { loadConfig } from './shared/config';
import { startJobs } from './shared/jobs';
import { logger } from './shared/logger';

const config = loadConfig();
const app = createApp(config);
app.listen(config.PORT, () => {
  logger.info(`Hissa API listening on :${config.PORT}`);
  startJobs(app.locals.jobs);
});
