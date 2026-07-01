import { execSync } from 'child_process';
import { app } from './api/server';
import { config } from './core/config';
import { logger } from './core/logger';
import { runWorker } from './worker/worker';

const start = async () => {
  // Sync DB schema on startup unless explicitly skipped
  if (process.env.SKIP_DB_PUSH !== 'true') {
    try {
      logger.info('Running database schema push (Prisma db push)...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      logger.info('Database schema push completed successfully.');
    } catch (err) {
      logger.error({ err }, 'Database schema push failed');
      process.exit(1);
    }
  }

  logger.info('Starting BullMQ worker in background...');
  runWorker().catch(err => logger.error({ err }, 'Worker crashed'));

  app.listen(config.port, () => {
    logger.info(`API server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start application');
  process.exit(1);
});
