import { app } from './api/server';
import { config } from './core/config';
import { logger } from './core/logger';
import { runWorker } from './worker/worker';

const start = async () => {
  const isWorker = process.env.RUN_WORKER === 'true';

  if (isWorker) {
    logger.info('Starting BullMQ worker...');
    await runWorker();
  } else {
    app.listen(config.port, () => {
      logger.info(`API server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  }
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start application');
  process.exit(1);
});
