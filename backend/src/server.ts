import { createApp } from './app';
import { loadConfig } from './shared/config';
import { logger } from './shared/logger';

const config = loadConfig();
createApp(config).listen(config.PORT, () => {
  logger.info(`Hissa API listening on :${config.PORT}`);
});
